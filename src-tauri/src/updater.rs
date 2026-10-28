use serde::{Deserialize, Serialize};
use std::{
    fs,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    revision: u64,
    phase: String,
    current_version: String,
    version: Option<String>,
    notes: String,
    received: u64,
    total: Option<u64>,
    error: Option<String>,
    approved: bool,
    automatic: bool,
    background: bool,
}
impl Default for Status {
    fn default() -> Self {
        Self {
            revision: 0,
            phase: "idle".into(),
            current_version: env!("CARGO_PKG_VERSION").into(),
            version: None,
            notes: String::new(),
            received: 0,
            total: None,
            error: None,
            approved: false,
            automatic: false,
            background: false,
        }
    }
}
#[derive(Default)]
struct Pending {
    status: Status,
    update: Option<Update>,
    bytes: Option<Vec<u8>>,
    last_progress: Option<Instant>,
}
#[derive(Default)]
pub struct Updates {
    pending: Mutex<Pending>,
    busy: AtomicBool,
    running: AtomicBool,
}
struct Operation<'a>(&'a AtomicBool);
impl Drop for Operation<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}
impl Updates {
    fn change(&self, app: &tauri::AppHandle, update: impl FnOnce(&mut Pending)) -> Status {
        let mut pending = self.pending.lock().unwrap();
        update(&mut pending);
        pending.status.revision += 1;
        let status = pending.status.clone();
        drop(pending);
        let _ = app.emit("updater-state", &status);
        status
    }
    fn acquire(&self) -> Result<Operation<'_>, String> {
        self.running
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map_err(|_| "更新操作正在进行".to_string())?;
        Ok(Operation(&self.running))
    }
    fn fail(&self, app: &tauri::AppHandle, error: impl ToString) -> String {
        let message = error.to_string();
        self.change(app, |pending| {
            pending.status.phase = "error".into();
            pending.status.error = Some(message.clone());
        });
        message
    }
    fn can_install(&self, app: &tauri::AppHandle) -> bool {
        !self.busy.load(Ordering::SeqCst)
            && !app
                .state::<std::sync::Arc<crate::hosting::Hosting>>()
                .running()
            && !app.state::<crate::desktop::Desktop>().voice_active()
    }
}
fn main_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "main" {
        return Err("主窗口负责更新安装".into());
    }
    Ok(())
}
fn client_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    if !["main", "aux-settings"].contains(&window.label()) {
        return Err("该窗口不能检查更新".into());
    }
    Ok(())
}
fn proxy_url(value: Option<String>) -> Result<Option<tauri::Url>, String> {
    value
        .map(|value| {
            let value = if value.contains("://") {
                value
            } else {
                format!("http://{value}")
            };
            let url = tauri::Url::parse(&value).map_err(|_| "代理地址无效")?;
            if !["http", "https"].contains(&url.scheme()) || url.host_str().is_none() {
                return Err("请填写 HTTP 或 HTTPS 代理地址".into());
            }
            Ok(url)
        })
        .transpose()
}
#[tauri::command]
pub fn updater_state(
    window: tauri::WebviewWindow,
    state: tauri::State<Updates>,
) -> Result<Status, String> {
    client_window(&window)?;
    Ok(state.pending.lock().unwrap().status.clone())
}
#[tauri::command]
pub fn updater_activity(
    window: tauri::WebviewWindow,
    state: tauri::State<Updates>,
    busy: bool,
) -> Result<(), String> {
    main_window(&window)?;
    state.busy.store(busy, Ordering::SeqCst);
    Ok(())
}
#[tauri::command]
pub fn updater_can_install(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<Updates>,
) -> Result<bool, String> {
    main_window(&window)?;
    Ok(!state.running.load(Ordering::SeqCst) && state.can_install(&app))
}
#[tauri::command]
pub async fn updater_check(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Updates>,
    proxy: Option<String>,
    background: bool,
) -> Result<Status, String> {
    client_window(&window)?;
    let _operation = state.acquire()?;
    if state.pending.lock().unwrap().status.phase == "downloaded" {
        return Ok(state.pending.lock().unwrap().status.clone());
    }
    let proxy = proxy_url(proxy)?;
    state.change(&app, |pending| {
        pending.status = Status {
            revision: pending.status.revision,
            phase: "checking".into(),
            background,
            ..Status::default()
        };
        pending.update = None;
        pending.bytes = None;
    });
    let result = async {
        let mut builder = app
            .updater_builder()
            .timeout(Duration::from_secs(30))
            .restart_after_install(true);
        builder = if let Some(proxy) = proxy {
            builder.proxy(proxy)
        } else {
            builder.no_proxy()
        };
        let update = builder
            .build()
            .map_err(|e| e.to_string())?
            .check()
            .await
            .map_err(|e| e.to_string())?;
        Ok::<_, String>(state.change(&app, |pending| {
            if let Some(update) = update {
                pending.status.phase = "available".into();
                pending.status.version = Some(update.version.clone());
                pending.status.notes = update.body.clone().unwrap_or_default();
                pending.update = Some(update);
            } else {
                pending.status.phase = "current".into();
            }
        }))
    }
    .await;
    result.map_err(|error| state.fail(&app, error))
}
#[tauri::command]
pub async fn updater_download(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Updates>,
    proxy: Option<String>,
    automatic: bool,
) -> Result<Status, String> {
    client_window(&window)?;
    let _operation = state.acquire()?;
    let mut update = state
        .pending
        .lock()
        .unwrap()
        .update
        .clone()
        .ok_or("请先检查更新")?;
    update.proxy = proxy_url(proxy)?;
    update.no_proxy = update.proxy.is_none();
    update.timeout = Some(Duration::from_secs(600));
    state.change(&app, |pending| {
        pending.status.phase = "downloading".into();
        pending.status.received = 0;
        pending.status.total = None;
        pending.status.error = None;
        pending.status.approved = true;
        pending.status.automatic = automatic;
        pending.last_progress = None;
    });
    let downloaded = update
        .download(
            |length, total| {
                let mut pending = state.pending.lock().unwrap();
                pending.status.received += length as u64;
                pending.status.total = total;
                let notify = pending
                    .last_progress
                    .is_none_or(|last| last.elapsed() >= Duration::from_millis(100));
                if notify {
                    pending.last_progress = Some(Instant::now());
                    pending.status.revision += 1;
                    let status = pending.status.clone();
                    drop(pending);
                    let _ = app.emit("updater-state", status);
                }
            },
            || {},
        )
        .await
        .map_err(|error| state.fail(&app, error))?;
    Ok(state.change(&app, |pending| {
        pending.update = Some(update);
        pending.bytes = Some(downloaded);
        pending.status.phase = "downloaded".into();
    }))
}
#[tauri::command]
pub fn updater_authorize(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<Updates>,
) -> Result<Status, String> {
    client_window(&window)?;
    let _operation = state.acquire()?;
    if state.pending.lock().unwrap().bytes.is_none() {
        return Err("更新尚未下载完成".into());
    }
    Ok(state.change(&app, |pending| {
        pending.status.automatic = false;
        pending.status.approved = true;
    }))
}
#[derive(Serialize, Deserialize)]
pub struct Receipt {
    from: String,
    to: String,
}
fn receipt_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    Ok(root.join("pending-update.json"))
}
#[tauri::command]
pub async fn updater_install(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Updates>,
) -> Result<(), String> {
    main_window(&window)?;
    let _operation = state.acquire()?;
    if !state.can_install(&app) {
        return Err("请先退出房间并结束连麦，再安装更新".into());
    }
    let update = {
        let pending = state.pending.lock().unwrap();
        if pending.bytes.is_none() {
            return Err("更新尚未下载完成".into());
        }
        pending.update.clone().ok_or("没有可安装的更新")?
    };
    let receipt = receipt_path(&app).map_err(|error| state.fail(&app, error))?;
    fs::write(
        &receipt,
        serde_json::to_vec(&Receipt {
            from: update.current_version.clone(),
            to: update.version.clone(),
        })
        .map_err(|e| e.to_string())?,
    )
    .map_err(|e| state.fail(&app, e))?;
    let bytes = state
        .pending
        .lock()
        .unwrap()
        .bytes
        .take()
        .ok_or("更新尚未下载完成")?;
    state.change(&app, |pending| pending.status.phase = "installing".into());
    let result = tauri::async_runtime::spawn_blocking(move || update.install(bytes))
        .await
        .map_err(|e| state.fail(&app, e))?;
    if let Err(error) = result {
        let _ = fs::remove_file(receipt);
        return Err(state.fail(&app, error));
    }
    app.state::<crate::desktop::Desktop>().prepare_quit();
    app.restart();
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Completed {
    installed: bool,
    version: String,
}
fn completed(current: &str, target: &str) -> Result<bool, String> {
    let current = semver::Version::parse(current).map_err(|e| e.to_string())?;
    let target = semver::Version::parse(target).map_err(|e| e.to_string())?;
    Ok(current >= target)
}
#[tauri::command]
pub fn updater_completion(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
) -> Result<Option<Completed>, String> {
    main_window(&window)?;
    let path = receipt_path(&app)?;
    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.to_string()),
    };
    let receipt: Receipt = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    let version = app.package_info().version.to_string();
    let installed = completed(&version, &receipt.to)?;
    fs::remove_file(path).map_err(|e| e.to_string())?;
    Ok(Some(Completed { installed, version }))
}
#[cfg(test)]
mod tests {
    use super::*;

    fn verification_updater(public: String) -> tauri_plugin_updater::Updater {
        let mut context = tauri::test::mock_context(tauri::test::noop_assets());
        context
            .config_mut()
            .plugins
            .0
            .insert("updater".into(), serde_json::json!({"pubkey":public}));
        let app = tauri::test::mock_builder()
            .plugin(tauri_plugin_updater::Builder::new().build())
            .build(context)
            .unwrap();
        app.updater_builder()
            .target("fixture")
            .version_comparator(|_, _| true)
            .executable_path("runtime-path/app")
            .endpoints(vec!["https://example.invalid/update".parse().unwrap()])
            .unwrap()
            .build()
            .unwrap()
    }
    #[test]
    fn official_sdk_verifies_signed_bytes_and_rejects_tampering_or_wrong_versions() {
        let updater = verification_updater(
            include_str!("../../tests/fixtures/update-public.pub")
                .trim()
                .into(),
        );
        let release = serde_json::json!({"version":"99.0.0","url":"https://example.invalid/update","signature":include_str!("../../tests/fixtures/update-payload.sig").trim()});
        let update = updater.restore_update(release.clone()).unwrap().unwrap();
        update
            .verify(include_bytes!("../../tests/fixtures/update-payload.txt"))
            .unwrap();
        assert!(update.verify(b"tampered").is_err());
        let mut wrong = release;
        wrong["version"] = serde_json::json!("99.0.1");
        assert!(updater
            .restore_update(wrong)
            .unwrap()
            .unwrap()
            .verify(include_bytes!("../../tests/fixtures/update-payload.txt"))
            .is_err());
    }
    #[test]
    #[ignore]
    fn built_bundle_signature() {
        let path = std::env::var("VERIFY_REAL_BUNDLE").expect("VERIFY_REAL_BUNDLE required");
        let config: serde_json::Value =
            serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let updater = verification_updater(
            config["plugins"]["updater"]["pubkey"]
                .as_str()
                .unwrap()
                .into(),
        );
        let signature = fs::read_to_string(format!("{path}.sig")).unwrap();
        let release = serde_json::json!({"version":env!("CARGO_PKG_VERSION"),"url":"https://example.invalid/update","signature":signature.trim()});
        updater
            .restore_update(release)
            .unwrap()
            .unwrap()
            .verify(&fs::read(path).unwrap())
            .unwrap();
    }
    #[test]
    fn concurrent_update_operations_do_not_overlap() {
        let state = Updates::default();
        let first = state.acquire().unwrap();
        assert!(state.acquire().is_err());
        drop(first);
        assert!(state.acquire().is_ok());
    }
    #[test]
    fn version_receipt_reports_actual_install_only() {
        assert!(completed("0.2.1", "0.2.1").unwrap());
        assert!(completed("0.3.0", "0.2.1").unwrap());
        assert!(!completed("0.2.0", "0.2.1").unwrap());
        assert!(completed("bad", "0.2.1").is_err());
    }
    #[test]
    fn proxy_accepts_a_local_address_without_forcing_it_on_every_client() {
        assert_eq!(proxy_url(None).unwrap(), None);
        assert_eq!(
            proxy_url(Some("127.0.0.1:7897".into()))
                .unwrap()
                .unwrap()
                .as_str(),
            "http://127.0.0.1:7897/"
        );
        assert!(proxy_url(Some("file:///etc/passwd".into())).is_err());
    }
}
