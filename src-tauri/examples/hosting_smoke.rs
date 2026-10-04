use hullqin_companion_lib::hosting::{self, Hosting};
use std::sync::Arc;
#[tauri::command]
fn report_stage(result: String) {
    let path = std::env::var("COMPANION_SMOKE_OUTPUT").expect("missing output path");
    std::fs::write(path, result).expect("cannot write smoke result");
}
#[tauri::command]
fn report(result: String, app: tauri::AppHandle) {
    let path = std::env::var("COMPANION_SMOKE_OUTPUT").expect("missing output path");
    std::fs::write(path, &result).expect("cannot write smoke result");
    app.exit(if result.starts_with("PASS") { 0 } else { 1 });
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(Arc::new(Hosting::default()))
        .invoke_handler(tauri::generate_handler![hosting::start_host, hosting::stop_host, report, report_stage])
        .on_page_load(|window, event| {
            if matches!(event.event(), tauri::webview::PageLoadEvent::Finished) {
                window.eval(include_str!("../../scripts/native-hosting-smoke.js")).expect("cannot start native smoke");
            }
        })
        .run(tauri::generate_context!()).expect("cannot run native smoke");
}
