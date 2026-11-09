#[cfg(not(mobile))]
pub mod cache;
#[cfg(not(mobile))]
#[cfg(not(mobile))]
mod desktop;
#[cfg(not(mobile))]
mod diagnostics;
#[cfg(not(mobile))]
mod emoji;
#[cfg(not(mobile))]
mod fonts;
#[cfg(not(mobile))]
pub mod hosting;
#[cfg(not(mobile))]
mod hosting_probe;
#[cfg(not(mobile))]
mod hosting_retry;
#[cfg(not(mobile))]
mod identity;
#[cfg(target_os = "ios")]
mod mobile;
#[cfg(not(mobile))]
mod network_proxy;
#[cfg(not(mobile))]
mod quick_api;
#[cfg(not(mobile))]
mod updater;
#[cfg(not(mobile))]
mod usage;
#[cfg(not(mobile))]
mod usage_model;
#[cfg(not(mobile))]
pub mod voice;
#[cfg(not(mobile))]
pub mod windows;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(not(mobile))]
    identity::prepare().expect("无法迁移已有数据，请先退出旧版客户端后重试；旧数据保持不变");
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init());
    #[cfg(not(mobile))]
    let builder = builder
        .manage(std::sync::Arc::new(hosting::Hosting::default()))
        .manage(std::sync::Arc::new(emoji::Downloads::default()))
        .register_uri_scheme_protocol("emoji", |_context, request| {
            emoji::resource(request.uri().path())
        })
        .register_uri_scheme_protocol("fonts", |_context, request| {
            fonts::resource(request.uri().path())
        })
        .manage(desktop::Desktop::default())
        .manage(usage::Usage::default())
        .manage(windows::Windows::default())
        .manage(updater::Updates::default())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            usage::usage_snapshot,
            usage::usage_context,
            usage::usage_enabled,
            usage::usage_reset,
            emoji::emoji_status,
            emoji::emoji_install,
            fonts::ensure_fonts,
            emoji::emoji_enabled,
            emoji::emoji_remove,
            emoji::emoji_cancel,
            voice::voice_config,
            voice::voice_save_config,
            voice::voice_request,
            voice::voice_active,
            diagnostics::record_log,
            diagnostics::application_logs,
            diagnostics::clear_application_logs,
            hosting::start_host,
            hosting::host_endpoint,
            hosting::hosting_info,
            hosting::abandon_hosted_run,
            hosting::stop_host,
            hosting::clear_cache,
            cache::cache_usage,
            desktop::quit_app,
            updater::updater_state,
            updater::updater_check,
            updater::updater_download,
            updater::updater_install,
            updater::updater_activity,
            updater::updater_authorize,
            updater::updater_can_install,
            updater::updater_completion,
            desktop::sync_menu,
            desktop::open_link,
            windows::present_auxiliary,
            windows::close_auxiliary,
            windows::auxiliary_state,
            windows::auxiliary_ready,
            windows::auxiliary_intent
        ])
        .on_window_event(windows::window_event);
    #[cfg(target_os = "ios")]
    let builder = builder
        .setup(mobile::setup)
        .plugin(tauri_plugin_barcode_scanner::init())
        .plugin(tauri_plugin_voice_native::init())
        .invoke_handler(tauri::generate_handler![
            mobile::voice_native_connect,
            mobile::voice_native_set_microphone,
            mobile::voice_native_set_deafened,
            mobile::voice_native_set_volume,
            mobile::voice_native_playback,
            mobile::voice_native_disconnect
        ]);
    builder
        .build(tauri::generate_context!())
        .expect("failed to build client")
        .run(|app, event| {
            #[cfg(not(mobile))]
            {
                use tauri::{Emitter, Manager};
                let hosting = app.state::<std::sync::Arc<hosting::Hosting>>();
                #[cfg(target_os = "macos")]
                if matches!(event, tauri::RunEvent::Reopen { .. }) {
                    desktop::show_main(app);
                }
                if let tauri::RunEvent::ExitRequested { api, .. } = &event {
                    if (hosting.running() || app.state::<desktop::Desktop>().voice_active())
                        && !app.state::<desktop::Desktop>().quitting()
                    {
                        api.prevent_exit();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                        }
                        let _ = app.emit("desktop-command", "quit");
                    }
                }
                if matches!(event, tauri::RunEvent::Exit) {
                    usage::stop(app);
                    hosting.stop();
                }
            }
        });
}
