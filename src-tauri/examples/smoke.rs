use tauri::Manager;
#[tauri::command]
fn report(result: String, app: tauri::AppHandle) {
    let path = std::env::var("COMPANION_SMOKE_OUTPUT").expect("missing output path");
    std::fs::write(path, &result).expect("cannot write smoke result");
    app.exit(if result.starts_with("PASS") { 0 } else { 1 });
}
#[tauri::command]
fn check_native(
    app: tauri::AppHandle,
    view: hullqin_companion_lib::windows::AuxiliaryView,
) -> Result<(), String> {
    let child = app
        .get_webview_window(view.label())
        .ok_or("辅助窗口未建立")?;
    if !child.is_decorated().map_err(|e| e.to_string())?
        || !child.is_resizable().map_err(|e| e.to_string())?
    {
        return Err("辅助窗口缺少原生装饰或缩放".into());
    }
    child
        .set_size(tauri::Size::Logical(tauri::LogicalSize::new(720.0, 620.0)))
        .map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
fn complete_auxiliary(
    app: tauri::AppHandle,
    view: hullqin_companion_lib::windows::AuxiliaryView,
) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("主窗口未建立")?
        .eval(&format!(
            "window.nativeCompleted = {{...window.nativeCompleted, {}:true}}",
            serde_json::to_string(&view).unwrap()
        ))
        .map_err(|e| e.to_string())
}
#[tauri::command]
fn resize_main(app: tauri::AppHandle, width: f64, height: f64) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("主窗口未建立")?
        .set_size(tauri::Size::Logical(tauri::LogicalSize::new(width, height)))
        .map_err(|e| e.to_string())
}
fn main() {
    tauri::Builder::default()
        .manage(std::sync::Arc::new(
            hullqin_companion_lib::hosting::Hosting::default(),
        ))
        .manage(hullqin_companion_lib::windows::Windows::default())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION,
                )
                .build(),
        )
        .on_window_event(hullqin_companion_lib::windows::window_event)
        .invoke_handler(tauri::generate_handler![
            report,
            resize_main,
            check_native,
            complete_auxiliary,
            hullqin_companion_lib::cache::cache_usage,
            hullqin_companion_lib::hosting::clear_cache,
            hullqin_companion_lib::windows::present_auxiliary,
            hullqin_companion_lib::windows::close_auxiliary,
            hullqin_companion_lib::windows::auxiliary_state,
            hullqin_companion_lib::windows::auxiliary_intent
        ])
        .on_page_load(|window, event| {
            if matches!(event.event(), tauri::webview::PageLoadEvent::Finished) {
                let script = if window.label() != "main" {
                    include_str!("../../scripts/native-auxiliary-smoke.js")
                } else {
                    match std::env::var("COMPANION_SMOKE_PROFILE").as_deref() {
                        Ok("ai") => include_str!("../../scripts/native-ai-smoke.js"),
                        _ => include_str!("../../scripts/native-smoke.js"),
                    }
                };
                window.eval(script).expect("cannot start native smoke");
            }
        })
        .run(tauri::generate_context!())
        .expect("cannot run native smoke");
}
