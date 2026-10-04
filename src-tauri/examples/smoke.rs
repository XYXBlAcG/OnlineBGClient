#[tauri::command]
fn report(result: String, app: tauri::AppHandle) {
    let path = std::env::var("COMPANION_SMOKE_OUTPUT").expect("missing output path");
    std::fs::write(path, &result).expect("cannot write smoke result");
    app.exit(if result.starts_with("PASS") { 0 } else { 1 });
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![report])
        .on_page_load(|window, event| {
            if matches!(event.event(), tauri::webview::PageLoadEvent::Finished) {
                window.eval(include_str!("../../scripts/native-smoke.js")).expect("cannot start native smoke");
            }
        })
        .run(tauri::generate_context!())
        .expect("cannot run native smoke");
}
