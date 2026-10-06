use hullqin_companion_lib::{
    hosting::{self, Hosting},
    windows,
};
use std::sync::Arc;
use tauri::Manager;
#[tauri::command]
fn report_stage(result: String) {
    let path = std::env::var("COMPANION_SMOKE_OUTPUT").expect("missing output path");
    std::fs::write(path, result).expect("cannot write smoke result");
}
#[tauri::command]
fn report(result: String, app: tauri::AppHandle) {
    report_stage(result.clone());
    app.exit(if result.starts_with("PASS") { 0 } else { 1 });
}
#[tauri::command]
fn mark_auxiliary(app: tauri::AppHandle) {
    app.get_webview_window("main")
        .unwrap()
        .eval("window.auxiliaryOpened = true")
        .unwrap();
}
#[tauri::command]
async fn probe_host(app: tauri::AppHandle, url: String) -> Result<serde_json::Value, String> {
    let running = app.state::<Arc<Hosting>>().running();
    let auxiliary = app.get_webview_window("aux-about").is_some();
    let reachable = tauri::async_runtime::spawn_blocking(move || {
        reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap()
            .get(format!("{url}/health"))
            .send()
            .is_ok_and(|response| response.status().is_success())
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({"running":running,"auxiliary":auxiliary,"reachable":reachable}))
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Arc::new(Hosting::default()))
        .manage(windows::Windows::default())
        .on_window_event(windows::window_event)
        .invoke_handler(tauri::generate_handler![
            hosting::start_host,
            hosting::stop_host,
            hosting::clear_cache,
            report,
            report_stage,
            probe_host,
            mark_auxiliary,
            windows::present_auxiliary,
            windows::close_auxiliary,
            windows::auxiliary_state,
            windows::auxiliary_intent,
            hullqin_companion_lib::cache::cache_usage
        ])
        .on_page_load(|window, event| {
            if matches!(event.event(), tauri::webview::PageLoadEvent::Finished) {
                window
                    .eval(include_str!("../../scripts/native-hosting-smoke.js"))
                    .expect("cannot start native smoke");
            }
        })
        .run(tauri::generate_context!())
        .expect("cannot run native smoke");
}
