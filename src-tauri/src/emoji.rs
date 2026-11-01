use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Cursor, Read},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager};
const LIMIT: u64 = 64 * 1024 * 1024;
#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    revision: u64,
    supported: bool,
    installed: bool,
    enabled: bool,
    phase: String,
    progress: f64,
    error: Option<String>,
    asset_version: Option<String>,
}
#[derive(Default)]
pub struct Downloads {
    running: AtomicBool,
    cancel: AtomicBool,
    status: Mutex<Status>,
}
#[derive(Deserialize)]
struct Manifest {
    format: u32,
    url: String,
    sha256: String,
    bytes: u64,
}
#[derive(Deserialize)]
struct Index {
    pixels: u32,
    codes: Vec<String>,
}
#[cfg(test)]
mod tests {
    use super::*;
    fn archive(name: &str) -> Vec<u8> {
        let encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        let mut tar = tar::Builder::new(encoder);
        for (path, bytes) in [
            (
                "index.json",
                br#"{"pixels":128,"codes":["1f913"]}"#.as_slice(),
            ),
            (
                name,
                include_bytes!("../../tests/fixtures/emoji.png").as_slice(),
            ),
        ] {
            let mut h = tar::Header::new_gnu();
            h.set_size(bytes.len() as u64);
            h.set_mode(0o644);
            h.set_cksum();
            tar.append_data(&mut h, path, bytes).unwrap();
        }
        tar.into_inner().unwrap().finish().unwrap()
    }
    #[test]
    fn install_verifies_pack_and_does_not_replace_existing_on_failure() {
        let root = std::env::temp_dir().join(format!("onlinebg-emoji-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let bytes = archive("1f913.png");
        install_pack(&root, &bytes, &format!("{:x}", Sha256::digest(&bytes))).unwrap();
        let original = fs::read(root.join("1f913.png")).unwrap();
        assert!(install_pack(&root, &bytes, "invalid").is_err());
        let bad = archive("nested/1f913.png");
        assert!(install_pack(&root, &bad, &format!("{:x}", Sha256::digest(&bad))).is_err());
        assert_eq!(fs::read(root.join("1f913.png")).unwrap(), original);
        fs::remove_dir_all(root).unwrap();
    }
}
fn root() -> Result<PathBuf, String> {
    Ok(dirs::data_local_dir()
        .ok_or("本机数据目录不可用")?
        .join(crate::identity::APP_ID.as_str())
        .join("optional-assets/apple-emoji"))
}
fn valid_code(code: &str) -> bool {
    !code.is_empty() && code.len() < 120 && code.bytes().all(|c| c.is_ascii_hexdigit() || c == b'-')
}
fn install_pack(root: &Path, bytes: &[u8], digest: &str) -> Result<(), String> {
    if bytes.len() as u64 > LIMIT || format!("{:x}", Sha256::digest(bytes)) != digest {
        return Err("表情包校验失败".into());
    }
    let parent = root.parent().ok_or("资源目录无效")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let staged = parent.join(format!(".emoji-{nonce}"));
    fs::create_dir(&staged).map_err(|e| e.to_string())?;
    let result = (|| {
        let mut total = 0u64;
        let mut count = 0;
        let mut seen = std::collections::HashSet::new();
        for item in tar::Archive::new(GzDecoder::new(Cursor::new(bytes)))
            .entries()
            .map_err(|e| e.to_string())?
        {
            let mut entry = item.map_err(|e| e.to_string())?;
            let path = entry.path().map_err(|e| e.to_string())?.into_owned();
            let name = path.to_str().ok_or("表情资源名称无效")?.to_owned();
            if !entry.header().entry_type().is_file()
                || (name != "index.json" && !name.strip_suffix(".png").is_some_and(valid_code))
                || !seen.insert(name.clone())
            {
                return Err("表情包文件结构无效".into());
            }
            let size = entry.size();
            total = total.checked_add(size).ok_or("表情包过大")?;
            count += 1;
            if total > LIMIT || size > 1024 * 1024 || count > 5000 {
                return Err("表情包超过资源预算".into());
            }
            let mut out = fs::File::create(staged.join(name)).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
        }
        let index: Index = serde_json::from_slice(
            &fs::read(staged.join("index.json")).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        if index.pixels != 128
            || index.codes.is_empty()
            || index
                .codes
                .iter()
                .collect::<std::collections::HashSet<_>>()
                .len()
                != index.codes.len()
            || index.codes.len() + 1 != count
        {
            return Err("表情清单无效".into());
        }
        for code in &index.codes {
            if !valid_code(code) {
                return Err("表情编号无效".into());
            }
            let png = fs::read(staged.join(format!("{code}.png"))).map_err(|e| e.to_string())?;
            if png.len() < 24
                || &png[..8] != b"\x89PNG\r\n\x1a\n"
                || u32::from_be_bytes(png[16..20].try_into().unwrap()) != 128
                || u32::from_be_bytes(png[20..24].try_into().unwrap()) != 128
            {
                return Err("表情图片无效".into());
            }
        }
        fs::write(staged.join("version"), digest).map_err(|e| e.to_string())?;
        fs::write(staged.join("enabled"), b"1").map_err(|e| e.to_string())?;
        let backup = parent.join(format!(".emoji-old-{nonce}"));
        let existed = root.exists();
        if existed {
            fs::rename(root, &backup).map_err(|e| e.to_string())?;
        }
        if let Err(error) = fs::rename(&staged, root) {
            if existed {
                let _ = fs::rename(&backup, root);
            }
            return Err(error.to_string());
        }
        if existed {
            let _ = fs::remove_dir_all(backup);
        }
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_dir_all(staged);
    }
    result
}
fn status(downloads: &Downloads) -> Status {
    let mut value = downloads.status.lock().unwrap().clone();
    value.supported = cfg!(target_os = "windows");
    if let Ok(path) = root() {
        value.installed = path.join("index.json").is_file();
        value.asset_version = fs::read_to_string(path.join("version")).ok();
        value.enabled = value.installed && path.join("enabled").exists();
    }
    value
}
fn client(window: &tauri::WebviewWindow) -> Result<(), String> {
    if !cfg!(target_os = "windows") {
        return Err("可选表情包仅用于 Windows 客户端".into());
    }
    if !["main", "aux-settings"].contains(&window.label()) {
        return Err("该窗口不能管理表情资源".into());
    }
    Ok(())
}
fn publish(app: &tauri::AppHandle, downloads: &Downloads, mut value: Status) {
    {
        let mut current = downloads.status.lock().unwrap();
        value.revision = current.revision + 1;
        *current = value;
    }
    let _ = app.emit("emoji-state", status(downloads));
}
#[tauri::command]
pub fn emoji_status(state: tauri::State<Arc<Downloads>>) -> Status {
    status(&state)
}
#[tauri::command]
pub fn emoji_enabled(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<Arc<Downloads>>,
    enabled: bool,
) -> Result<Status, String> {
    client(&window)?;
    if state.running.load(Ordering::SeqCst) {
        return Err("请先等待下载完成或取消".into());
    }
    let path = root()?;
    if enabled {
        if !path.join("index.json").is_file() {
            return Err("请先下载表情包".into());
        }
        fs::write(path.join("enabled"), b"1").map_err(|e| e.to_string())?;
    } else if path.join("enabled").exists() {
        fs::remove_file(path.join("enabled")).map_err(|e| e.to_string())?;
    }
    publish(&app, &state, Status::default());
    Ok(status(&state))
}
#[tauri::command]
pub fn emoji_remove(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<Arc<Downloads>>,
) -> Result<Status, String> {
    client(&window)?;
    if state.running.load(Ordering::SeqCst) {
        return Err("请先取消下载".into());
    }
    let path = root()?;
    if path.exists() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())?;
    }
    publish(&app, &state, Status::default());
    Ok(status(&state))
}
#[tauri::command]
pub fn emoji_cancel(
    window: tauri::WebviewWindow,
    state: tauri::State<Arc<Downloads>>,
) -> Result<(), String> {
    client(&window)?;
    state.cancel.store(true, Ordering::SeqCst);
    Ok(())
}
#[tauri::command]
pub async fn emoji_install(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    proxy: Option<String>,
) -> Result<Status, String> {
    client(&window)?;
    let downloads = app.state::<Arc<Downloads>>().inner().clone();
    if downloads.running.swap(true, Ordering::SeqCst) {
        return Err("表情包正在下载".into());
    }
    downloads.cancel.store(false, Ordering::SeqCst);
    let task = move || {
        publish(
            &app,
            &downloads,
            Status {
                phase: "downloading".into(),
                ..Default::default()
            },
        );
        let result = (|| {
            let mut builder = reqwest::blocking::Client::builder()
                .timeout(Duration::from_secs(240))
                .connect_timeout(Duration::from_secs(15))
                .user_agent("OnlineBGClient");
            if let Some(value) = proxy {
                let url = if value.contains("://") {
                    value
                } else {
                    format!("http://{value}")
                };
                let parsed = tauri::Url::parse(&url).map_err(|_| "代理地址无效")?;
                if !["http", "https"].contains(&parsed.scheme()) {
                    return Err("请使用 HTTP 代理".to_string());
                }
                builder = builder.proxy(reqwest::Proxy::all(url).map_err(|e| e.to_string())?);
            }
            let client = builder.build().map_err(|e| e.to_string())?;
            let response=client.get("https://github.com/XYXBlAcG/OnlineBGClient/releases/latest/download/emoji-pack.json").send().map_err(|e|e.to_string())?;
            if response.status() == reqwest::StatusCode::NOT_FOUND {
                return Err("当前 Release 尚未提供可选表情包，发布后可重新下载".into());
            }
            let manifest: Manifest = response
                .error_for_status()
                .map_err(|e| e.to_string())?
                .json()
                .map_err(|e| e.to_string())?;
            if manifest.format != 1
                || manifest.bytes > LIMIT
                || !manifest
                    .url
                    .starts_with("https://github.com/XYXBlAcG/OnlineBGClient/releases/download/")
            {
                return Err("表情包下载清单无效".into());
            }
            let mut response = client
                .get(&manifest.url)
                .send()
                .map_err(|e| e.to_string())?
                .error_for_status()
                .map_err(|e| e.to_string())?;
            let mut bytes = Vec::new();
            let mut buffer = [0u8; 64 * 1024];
            let mut last = Instant::now();
            loop {
                if downloads.cancel.load(Ordering::SeqCst) {
                    return Err("已取消下载".into());
                }
                let count = response.read(&mut buffer).map_err(|e| e.to_string())?;
                if count == 0 {
                    break;
                }
                bytes.extend_from_slice(&buffer[..count]);
                if bytes.len() as u64 > LIMIT {
                    return Err("下载资源超过预算".into());
                }
                if last.elapsed() > Duration::from_millis(100) {
                    publish(
                        &app,
                        &downloads,
                        Status {
                            phase: "downloading".into(),
                            progress: bytes.len() as f64 / manifest.bytes.max(1) as f64,
                            ..Default::default()
                        },
                    );
                    last = Instant::now();
                }
            }
            if downloads.cancel.load(Ordering::SeqCst) {
                return Err("已取消下载".into());
            }
            if bytes.len() as u64 != manifest.bytes {
                return Err("下载文件大小不匹配".into());
            }
            install_pack(&root()?, &bytes, &manifest.sha256)
        })();
        downloads.running.store(false, Ordering::SeqCst);
        match result {
            Ok(()) => {
                publish(&app, &downloads, Status::default());
                Ok(status(&downloads))
            }
            Err(error) => {
                publish(
                    &app,
                    &downloads,
                    Status {
                        phase: "error".into(),
                        error: Some(error.clone()),
                        ..Default::default()
                    },
                );
                Err(error)
            }
        }
    };
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|e| e.to_string())?
}
pub fn resource(path: &str) -> tauri::http::Response<Vec<u8>> {
    let name = path.trim_start_matches('/');
    let permitted = name == "index.json" || name.strip_suffix(".png").is_some_and(valid_code);
    let bytes = if permitted {
        root().ok().and_then(|root| fs::read(root.join(name)).ok())
    } else {
        None
    };
    let code = if bytes.is_some() { 200 } else { 404 };
    tauri::http::Response::builder()
        .status(code)
        .header(
            "Content-Type",
            if name == "index.json" {
                "application/json"
            } else {
                "image/png"
            },
        )
        .header("Access-Control-Allow-Origin", "*")
        .header("Cache-Control", "no-store")
        .body(bytes.unwrap_or_default())
        .unwrap()
}
#[cfg(test)]
mod real_pack_test {
    use super::*;
    #[test]
    fn generated_pack_installs_with_all_files() {
        let Ok(path) = std::env::var("EMOJI_PACK_TEST_PATH") else {
            return;
        };
        let bytes = fs::read(path).unwrap();
        let root = std::env::temp_dir().join(format!("onlinebg-real-emoji-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        install_pack(&root, &bytes, &format!("{:x}", Sha256::digest(&bytes))).unwrap();
        let index: Index =
            serde_json::from_slice(&fs::read(root.join("index.json")).unwrap()).unwrap();
        assert!(index.codes.len() > 3000);
        fs::remove_dir_all(root).unwrap();
    }
}
