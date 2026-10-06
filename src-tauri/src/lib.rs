#[cfg(not(mobile))]
pub mod cache;
#[cfg(not(mobile))]
mod desktop;
#[cfg(not(mobile))]
pub mod hosting;
#[cfg(not(mobile))]
pub mod windows;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init());
    #[cfg(not(mobile))]
    let builder = builder
        .manage(std::sync::Arc::new(hosting::Hosting::default()))
        .manage(desktop::Desktop::default())
        .manage(windows::Windows::default())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED,
                )
                .build(),
        )
        .setup(desktop::setup)
        .on_menu_event(desktop::menu)
        .invoke_handler(tauri::generate_handler![
            hosting::start_host,
            hosting::stop_host,
            hosting::clear_cache,
            cache::cache_usage,
            desktop::quit_app,
            desktop::open_link,
            windows::present_auxiliary,
            windows::close_auxiliary,
            windows::auxiliary_state,
            windows::auxiliary_intent
        ])
        .on_window_event(windows::window_event);
    builder
        .build(tauri::generate_context!())
        .expect("failed to build desktop client")
        .run(|app, event| {
            #[cfg(not(mobile))]
            {
                use tauri::{Emitter, Manager};
                let hosting = app.state::<std::sync::Arc<hosting::Hosting>>();
                if let tauri::RunEvent::ExitRequested { api, .. } = &event {
                    if hosting.running() && !app.state::<desktop::Desktop>().quitting() {
                        api.prevent_exit();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                        }
                        let _ = app.emit("desktop-command", "quit");
                    }
                }
                if matches!(event, tauri::RunEvent::Exit) {
                    hosting.stop();
                }
            }
        });
}
