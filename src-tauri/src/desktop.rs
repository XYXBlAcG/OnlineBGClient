use std::sync::atomic::{AtomicBool, Ordering};
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};

#[derive(Default)]
pub struct Desktop {
    quitting: AtomicBool,
    voice: AtomicBool,
}
impl Desktop {
    pub fn prepare_quit(&self) {
        self.quitting.store(true, Ordering::SeqCst);
    }
    pub fn quitting(&self) -> bool {
        self.quitting.load(Ordering::SeqCst)
    }
    pub fn voice_active(&self) -> bool {
        self.voice.load(Ordering::SeqCst)
    }
    pub fn set_voice(&self, active: bool) {
        self.voice.store(active, Ordering::SeqCst);
    }
}

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?
        .on_permission_request(|webview, kind| {
            use tauri::webview::{PermissionKind, PermissionResponse};
            match kind {
                PermissionKind::Microphone => {
                    let local = webview
                        .url()
                        .map(|url| {
                            url.scheme() == "tauri"
                                || matches!(
                                    url.host_str(),
                                    Some("tauri.localhost") | Some("localhost") | Some("127.0.0.1")
                                )
                        })
                        .unwrap_or(false);
                    if webview.label() == "main" && local {
                        PermissionResponse::Default
                    } else {
                        PermissionResponse::Deny
                    }
                }
                PermissionKind::Camera => PermissionResponse::Deny,
                _ => PermissionResponse::Default,
            }
        })
        .build()?;
    let settings = MenuItem::with_id(app, "settings", "设置…", true, Some("CmdOrCtrl+,"))?;
    let records = MenuItem::with_id(app, "records", "对局记录", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    #[cfg(target_os = "macos")]
    {
        let menu = Menu::new(app.handle())?;
        let groups: Vec<MenuGroup> =
            serde_json::from_str(include_str!("../../src/client/desktop-menu.json"))?;
        for group in groups {
            let sub = Submenu::with_id(app, &group.id, &group.title, true)?;
            for item in group.items {
                sub.append(&MenuItem::with_id(
                    app,
                    &item.id,
                    &item.title,
                    item.id == "quit",
                    item.binding
                        .as_deref()
                        .map(|key| key.replace("Meta", "Cmd")),
                )?)?;
            }
            menu.append(&sub)?;
        }
        let edit = Submenu::with_id(app, "editing", "编辑操作", true)?;
        use tauri::menu::PredefinedMenuItem;
        edit.append_items(&[
            &PredefinedMenuItem::undo(app, Some("撤销"))?,
            &PredefinedMenuItem::redo(app, Some("重做"))?,
            &PredefinedMenuItem::cut(app, Some("剪切"))?,
            &PredefinedMenuItem::copy(app, Some("复制"))?,
            &PredefinedMenuItem::paste(app, Some("粘贴"))?,
            &MenuItem::with_id(app, "edit.selectAll", "全选", true, Some("Cmd+A"))?,
        ])?;
        menu.append(&edit)?;
        app.set_menu(menu)?;
    }
    let tray_menu = Menu::with_items(app, &[&show, &settings, &records, &quit])?;
    let tray = TrayIconBuilder::new()
        .tooltip("OnlineBGClient")
        .menu(&tray_menu);
    if let Some(icon) = app.default_window_icon() {
        tray.icon(icon.clone()).build(app)?;
    } else {
        tray.build(app)?;
    }
    Ok(())
}

pub fn menu(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    let view = match event.id.as_ref() {
        "app.about" | "about" => Some(crate::windows::AuxiliaryView::About),
        "app.records" | "records" => Some(crate::windows::AuxiliaryView::Records),
        "app.settings" | "settings" => Some(crate::windows::AuxiliaryView::Settings),
        id if id.starts_with("settings.") => Some(crate::windows::AuxiliaryView::Settings),
        _ => None,
    };
    if let Some(view) = view {
        if app.state::<crate::windows::Windows>().is_ready(view) {
            if let Some(window) = app.get_webview_window(view.label()) {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
    if event.id.as_ref() == "edit.selectAll" {
        if let Some(window) = app
            .webview_windows()
            .into_values()
            .find(|window| window.is_focused().unwrap_or(false))
        {
            let _ = window.emit("edit-select-all", ());
        }
        return;
    }
    if let Some(window) = app.get_webview_window("main") {
        match event.id.as_ref() {
            "show" => {
                let _ = window.show();
                let _ = window.set_focus();
            }
            "about" | "settings" | "records" => {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = app.emit("desktop-command", event.id.as_ref());
            }
            "quit" => {
                let _ = window.show();
                let _ = app.emit("desktop-command", "quit");
            }
            id => {
                let _ = app.emit_to("main", "desktop-command", id);
            }
        }
    }
}

#[derive(serde::Deserialize)]
struct MenuGroup {
    id: String,
    title: String,
    items: Vec<MenuEntry>,
}
#[derive(serde::Deserialize)]
struct MenuEntry {
    id: String,
    title: String,
    binding: Option<String>,
}
#[derive(serde::Deserialize)]
pub struct MenuCommand {
    id: String,
    title: String,
    binding: String,
    enabled: bool,
}
#[tauri::command]
pub fn sync_menu(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    commands: Vec<MenuCommand>,
    recording: bool,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("主窗口负责菜单状态".into());
    }
    if let Some(menu) = app.menu() {
        for group in menu.items().map_err(|e| e.to_string())? {
            if let Some(sub) = group.as_submenu() {
                sub.set_enabled(!recording).map_err(|e| e.to_string())?;
                for entry in sub.items().map_err(|e| e.to_string())? {
                    if let Some(item) = entry.as_menuitem() {
                        if let Some(command) = commands
                            .iter()
                            .find(|command| command.id == item.id().as_ref())
                        {
                            item.set_enabled(command.enabled && !recording)
                                .map_err(|e| e.to_string())?;
                            item.set_text(&command.title).map_err(|e| e.to_string())?;
                            let key = command
                                .binding
                                .replace("Meta", "Cmd")
                                .replace("Control", "Ctrl");
                            item.set_accelerator(if key.is_empty() || recording {
                                None
                            } else {
                                Some(key.as_str())
                            })
                            .map_err(|e| e.to_string())?;
                        } else if item.id().as_ref() == "edit.selectAll" {
                            item.set_enabled(!recording).map_err(|e| e.to_string())?;
                            item.set_accelerator(if recording { None } else { Some("Cmd+A") })
                                .map_err(|e| e.to_string())?;
                        } else if item.id().as_ref() != "quit" {
                            item.set_enabled(false).map_err(|e| e.to_string())?;
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle, state: tauri::State<'_, Desktop>) {
    state.quitting.store(true, Ordering::SeqCst);
    app.exit(0);
}

#[tauri::command]
pub fn open_link(key: String) -> Result<(), String> {
    let profile: serde_json::Value =
        serde_json::from_str(include_str!("../../src/client/about.json"))
            .map_err(|error| error.to_string())?;
    if !["github", "original", "livekit"].contains(&key.as_str()) {
        return Err("链接未配置".into());
    }
    let url = profile[&key].as_str().ok_or("链接未配置")?;
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(target_os = "windows")]
    let mut command = std::process::Command::new("explorer.exe");
    #[cfg(target_os = "linux")]
    let mut command = std::process::Command::new("xdg-open");
    let mut child = command
        .arg(url)
        .spawn()
        .map_err(|error| error.to_string())?;
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}
