use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager};
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::tray::TrayIconBuilder;

#[derive(Default)]
pub struct Desktop { quitting: AtomicBool }
impl Desktop { pub fn quitting(&self) -> bool { self.quitting.load(Ordering::SeqCst) } }

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let about = MenuItem::with_id(app, "about", "关于 OnlineBGClient", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "设置…", true, Some("CmdOrCtrl+,"))?;
    let records = MenuItem::with_id(app, "records", "对局记录", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::default(app.handle())?;
    menu.append(&Submenu::with_items(app, "桌游", true, &[&about, &settings, &records, &show])?)?;
    app.set_menu(menu)?;
    let tray_menu = Menu::with_items(app, &[&show, &settings, &records, &quit])?;
    let tray = TrayIconBuilder::new().tooltip("OnlineBGClient").menu(&tray_menu);
    if let Some(icon) = app.default_window_icon() { tray.icon(icon.clone()).build(app)?; } else { tray.build(app)?; }
    Ok(())
}

pub fn menu(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    if let Some(window) = app.get_webview_window("main") {
        match event.id.as_ref() {
            "show" => { let _ = window.show(); let _ = window.set_focus(); }
            "about" | "settings" | "records" => { let _ = window.show(); let _ = window.set_focus(); let _ = app.emit("desktop-command", event.id.as_ref()); }
            "quit" => { let _ = window.show(); let _ = app.emit("desktop-command", "quit"); }
            _ => {}
        }
    }
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle, state: tauri::State<'_, Desktop>) {
    state.quitting.store(true, Ordering::SeqCst);
    app.exit(0);
}

#[tauri::command]
pub fn open_profile() -> Result<(), String> {
    let profile: serde_json::Value = serde_json::from_str(include_str!("../../src/client/about.json")).map_err(|error| error.to_string())?;
    let url = profile["github"].as_str().ok_or("GitHub 主页未配置")?;
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(target_os = "windows")]
    let mut command = std::process::Command::new("explorer.exe");
    #[cfg(target_os = "linux")]
    let mut command = std::process::Command::new("xdg-open");
    let mut child = command.arg(url).spawn().map_err(|error| error.to_string())?;
    std::thread::spawn(move || { let _ = child.wait(); });
    Ok(())
}
