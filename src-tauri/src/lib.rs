#[cfg(not(mobile))]
pub mod hosting;
#[cfg(not(mobile))]
mod desktop;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_fs::init());
    #[cfg(not(mobile))]
    let builder = builder.manage(std::sync::Arc::new(hosting::Hosting::default()))
        .manage(desktop::Desktop::default())
        .setup(desktop::setup)
        .on_menu_event(desktop::menu)
        .invoke_handler(tauri::generate_handler![hosting::start_host, hosting::stop_host, desktop::quit_app])
        .on_window_event(|window, event| {
            use tauri::{Emitter, Manager};
            let hosting = window.state::<std::sync::Arc<hosting::Hosting>>();
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if hosting.running() { api.prevent_close(); let _ = window.emit("desktop-command", "close"); }
            }
            if matches!(event, tauri::WindowEvent::Destroyed) { hosting.stop(); }
        });
    builder.build(tauri::generate_context!()).expect("failed to build desktop client").run(|app, event| {
        #[cfg(not(mobile))] {
            use tauri::{Emitter, Manager};
            let hosting = app.state::<std::sync::Arc<hosting::Hosting>>();
            if let tauri::RunEvent::ExitRequested { api, .. } = &event {
                if hosting.running() && !app.state::<desktop::Desktop>().quitting() {
                    api.prevent_exit();
                    if let Some(window) = app.get_webview_window("main") { let _ = window.show(); }
                    let _ = app.emit("desktop-command", "quit");
                }
            }
            if matches!(event, tauri::RunEvent::Exit) { hosting.stop(); }
        }
    });
}
