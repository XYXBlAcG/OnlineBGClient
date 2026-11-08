use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::time::Duration;

const FONT_PACK_URL: &str =
    "https://github.com/XYXBlAcG/OnlineBGClient/releases/download/v0.4.1/OnlineBGClient-fonts-0.4.1.zip";
const FONT_FILES: [&str; 3] = [
    "SFNS.woff2",
    "PingFangSC-Regular.woff2",
    "PingFangSC-Semibold.woff2",
];
const DOWNLOAD_LIMIT: usize = 64 * 1024 * 1024;
const ENTRY_LIMIT: u64 = 32 * 1024 * 1024;
static DOWNLOAD: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

fn root() -> Result<PathBuf, String> {
    Ok(dirs::data_local_dir()
        .ok_or("本机数据目录不可用")?
        .join(crate::identity::APP_ID.as_str())
        .join("optional-assets/fonts"))
}

fn ready(root: &Path) -> bool {
    FONT_FILES.iter().all(|name| {
        std::fs::metadata(root.join(name))
            .map(|metadata| metadata.len() > 1024)
            .unwrap_or(false)
    })
}

#[tauri::command]
pub async fn ensure_fonts() -> Result<Vec<String>, String> {
    let root = root()?;
    if ready(&root) {
        return Ok(FONT_FILES.map(str::to_string).to_vec());
    }
    let _guard = DOWNLOAD.lock().await;
    if ready(&root) {
        return Ok(FONT_FILES.map(str::to_string).to_vec());
    }
    let bytes = reqwest::Client::new()
        .get(FONT_PACK_URL)
        .header(reqwest::header::USER_AGENT, "OnlineBGClient")
        .timeout(Duration::from_secs(120))
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .bytes()
        .await
        .map_err(|error| error.to_string())?;
    if bytes.len() > DOWNLOAD_LIMIT {
        return Err("字体包超过下载上限".into());
    }
    let parent = root.parent().ok_or("字体目录无效")?;
    std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let staged = parent.join(format!(".fonts-{nonce}"));
    std::fs::create_dir(&staged).map_err(|error| error.to_string())?;
    let result = (|| {
        let mut archive =
            zip::ZipArchive::new(Cursor::new(bytes.as_ref())).map_err(|error| error.to_string())?;
        for name in FONT_FILES {
            let mut entry = archive.by_name(name).map_err(|error| error.to_string())?;
            if entry.size() > ENTRY_LIMIT {
                return Err("字体文件超过大小限制".into());
            }
            let mut output =
                std::fs::File::create(staged.join(name)).map_err(|error| error.to_string())?;
            std::io::copy(&mut entry, &mut output).map_err(|error| error.to_string())?;
        }
        if !ready(&staged) {
            return Err("字体包内容不完整".into());
        }
        if root.exists() {
            std::fs::remove_dir_all(&root).map_err(|error| error.to_string())?;
        }
        std::fs::rename(&staged, &root).map_err(|error| error.to_string())?;
        Ok(FONT_FILES.map(str::to_string).to_vec())
    })();
    if result.is_err() {
        let _ = std::fs::remove_dir_all(&staged);
    }
    result
}

pub fn resource(path: &str) -> tauri::http::Response<Vec<u8>> {
    let name = path.trim_start_matches('/');
    let bytes = if FONT_FILES.contains(&name) {
        root()
            .ok()
            .and_then(|root| std::fs::read(root.join(name)).ok())
    } else {
        None
    };
    let code = if bytes.is_some() { 200 } else { 404 };
    tauri::http::Response::builder()
        .status(code)
        .header("Content-Type", "font/woff2")
        .header("Access-Control-Allow-Origin", "*")
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .body(bytes.unwrap_or_default())
        .unwrap()
}
