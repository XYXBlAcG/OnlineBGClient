use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::HashMap, sync::Mutex};
use tauri::{Emitter, Manager};
#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum AuxiliaryView {
    Settings,
    About,
    Records,
    Invite,
    Diagnostics,
    Actions,
    Exit,
    Roomsetup,
    Chat,
    Guide,
}
impl AuxiliaryView {
    pub fn label(self) -> &'static str {
        match self {
            Self::Settings => "aux-settings",
            Self::About => "aux-about",
            Self::Records => "aux-records",
            Self::Invite => "aux-invite",
            Self::Diagnostics => "aux-diagnostics",
            Self::Actions => "aux-actions",
            Self::Exit => "aux-exit",
            Self::Roomsetup => "aux-roomsetup",
            Self::Chat => "aux-chat",
            Self::Guide => "aux-guide",
        }
    }
    fn title(self) -> &'static str {
        match self {
            Self::Settings => "设置",
            Self::About => "关于 OnlineBGClient",
            Self::Records => "对局记录",
            Self::Invite => "邀请朋友",
            Self::Diagnostics => "AI 计算诊断",
            Self::Actions => "游戏操作",
            Self::Exit => "退出客户端",
            Self::Roomsetup => "下一局",
            Self::Chat => "房间消息",
            Self::Guide => "新手引导",
        }
    }
}
#[derive(Clone, Serialize)]
pub struct Frame {
    revision: u64,
    payload: Value,
    visible: bool,
    #[serde(skip_serializing)]
    focus: bool,
    #[serde(skip_serializing)]
    opened: u64,
}
#[derive(Default)]
pub struct Windows {
    frames: Mutex<HashMap<String, Frame>>,
}
impl Windows {
    fn publish(&self, view: AuxiliaryView, payload: Value, focus: bool) -> Frame {
        let mut frames = self.frames.lock().unwrap();
        let label = view.label().to_string();
        let previous = frames.get(&label);
        let revision = previous.map_or(1, |old| old.revision + 1);
        let frame = Frame {
            revision,
            payload,
            visible: true,
            opened: previous
                .filter(|old| old.visible)
                .map_or(revision, |old| old.opened),
            focus: focus || previous.is_some_and(|old| old.focus && old.visible),
        };
        frames.insert(label, frame.clone());
        frame
    }
    pub fn is_ready(&self, view: AuxiliaryView) -> bool {
        self.frames
            .lock()
            .unwrap()
            .get(view.label())
            .is_some_and(|frame| frame.visible && !frame.focus)
    }
    fn hide(&self, view: AuxiliaryView) -> Option<Frame> {
        let mut frames = self.frames.lock().unwrap();
        let frame = frames.get_mut(view.label())?;
        frame.revision += 1;
        frame.visible = false;
        frame.focus = false;
        Some(frame.clone())
    }
    fn ready(&self, view: AuxiliaryView, revision: u64) -> Option<Frame> {
        let mut frames = self.frames.lock().unwrap();
        let frame = frames.get_mut(view.label())?;
        if !frame.visible || frame.revision != revision {
            return None;
        }
        let result = frame.clone();
        frame.focus = false;
        Some(result)
    }
}
#[tauri::command]
pub async fn present_auxiliary(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Windows>,
    view: AuxiliaryView,
    payload: Value,
    focus: bool,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("仅主窗口可以发布状态".into());
    }
    let frame = state.publish(view, payload, focus);
    if let Some(child) = app.get_webview_window(view.label()) {
        child
            .emit("auxiliary-state", frame.clone())
            .map_err(|e| e.to_string())?;
        if focus {
            watch_ready(app.clone(), view, frame.opened);
        }
        return Ok(());
    }
    let main = app.get_webview_window("main").ok_or("主窗口未就绪")?;
    let key = serde_json::to_value(view)
        .unwrap()
        .as_str()
        .unwrap()
        .to_string();
    tauri::WebviewWindowBuilder::new(
        &app,
        view.label(),
        tauri::WebviewUrl::App(format!("index.html?aux={key}").into()),
    )
    .title(view.title())
    .visible(false)
    .decorations(true)
    .resizable(true)
    .inner_size(
        if matches!(view, AuxiliaryView::Records) {
            1000.0
        } else if matches!(view, AuxiliaryView::Chat | AuxiliaryView::Guide) {
            440.0
        } else {
            640.0
        },
        680.0,
    )
    .min_inner_size(380.0, 320.0)
    .parent(&main)
    .map_err(|e| e.to_string())?
    .build()
    .map_err(|e| e.to_string())?;
    watch_ready(app.clone(), view, frame.opened);
    Ok(())
}
fn watch_ready(handle: tauri::AppHandle, view: AuxiliaryView, opened: u64) {
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(10));
        let state = handle.state::<Windows>();
        let pending = state
            .frames
            .lock()
            .unwrap()
            .get(view.label())
            .is_some_and(|current| current.visible && current.focus && current.opened == opened);
        if pending {
            let _ = conceal(&handle, view);
            let _ = handle.emit_to(
                "main",
                "auxiliary-intent",
                serde_json::json!({"view":view,"type":"close"}),
            );
            let _=handle.emit_to("main","auxiliary-intent",serde_json::json!({"view":view,"type":"error","message":"窗口内容加载超时，请重新打开"}));
        }
    });
}

fn conceal(app: &tauri::AppHandle, view: AuxiliaryView) -> Result<(), String> {
    let frame = app.state::<Windows>().hide(view);
    if let Some(child) = app.get_webview_window(view.label()) {
        child.hide().map_err(|e| e.to_string())?;
        if let Some(frame) = frame {
            child
                .emit("auxiliary-state", frame)
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
#[tauri::command]
pub fn auxiliary_ready(
    window: tauri::WebviewWindow,
    state: tauri::State<Windows>,
    view: AuxiliaryView,
    revision: u64,
    background: String,
) -> Result<(), String> {
    let background = background.parse::<tauri::window::Color>()?;
    if window.label() != view.label() {
        return Err("窗口身份不匹配".into());
    }
    if let Some(frame) = state.ready(view, revision) {
        if frame.focus {
            #[cfg(target_os = "macos")]
            window
                .as_ref()
                .window()
                .set_background_color(Some(background))
                .map_err(|e| e.to_string())?;
            #[cfg(not(target_os = "macos"))]
            window
                .set_background_color(Some(background))
                .map_err(|e| e.to_string())?;
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn close_auxiliary(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    view: AuxiliaryView,
) -> Result<(), String> {
    if window.label() != "main" && window.label() != view.label() {
        return Err("窗口身份不匹配".into());
    }
    conceal(&app, view)?;
    if !matches!(
        view,
        AuxiliaryView::Settings | AuxiliaryView::About | AuxiliaryView::Records
    ) {
        if let Some(child) = app.get_webview_window(view.label()) {
            child.close().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
#[tauri::command]
pub fn auxiliary_state(
    window: tauri::WebviewWindow,
    state: tauri::State<Windows>,
    view: AuxiliaryView,
) -> Result<Frame, String> {
    if window.label() != view.label() {
        return Err("窗口身份不匹配".into());
    }
    state
        .frames
        .lock()
        .unwrap()
        .get(view.label())
        .cloned()
        .ok_or("窗口状态未就绪".into())
}
#[tauri::command]
pub fn auxiliary_intent(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    intent: Value,
) -> Result<(), String> {
    let view: AuxiliaryView =
        serde_json::from_value(intent["view"].clone()).map_err(|e| e.to_string())?;
    if window.label() != view.label() {
        return Err("窗口身份不匹配".into());
    }
    if matches!(view, AuxiliaryView::Guide) && intent["type"] == "guide-locate" {
        app.get_webview_window("main")
            .ok_or("主窗口未就绪")?
            .set_focus()
            .map_err(|e| e.to_string())?;
    }
    app.emit_to("main", "auxiliary-intent", intent)
        .map_err(|e| e.to_string())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn windows_hold_one_ordered_projection_per_view() {
        let state = Windows::default();
        let first = state.publish(
            AuxiliaryView::Settings,
            serde_json::json!({"theme":"light"}),
            true,
        );
        let second = state.publish(
            AuxiliaryView::Settings,
            serde_json::json!({"theme":"dark"}),
            false,
        );
        assert_eq!(second.revision, first.revision + 1);
        assert_eq!(second.opened, first.opened);
        assert_eq!(state.frames.lock().unwrap().len(), 1);
        assert_eq!(second.payload["theme"], "dark");
    }
    #[test]
    fn closed_or_superseded_windows_cannot_reappear_from_stale_ready() {
        let state = Windows::default();
        let first = state.publish(AuxiliaryView::About, serde_json::json!({}), true);
        state.hide(AuxiliaryView::About);
        assert!(state.ready(AuxiliaryView::About, first.revision).is_none());
        let second = state.publish(AuxiliaryView::About, serde_json::json!({}), true);
        assert!(state.ready(AuxiliaryView::About, first.revision).is_none());
        assert_ne!(first.opened, second.opened);
        assert!(!state.is_ready(AuxiliaryView::About));
        assert!(
            state
                .ready(AuxiliaryView::About, second.revision)
                .unwrap()
                .focus
        );
        assert!(state.is_ready(AuxiliaryView::About));
        assert!(
            !state
                .ready(AuxiliaryView::About, second.revision)
                .unwrap()
                .focus
        );
    }
}

pub fn window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if window.label() != "main" {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            if let Some(key) = window.label().strip_prefix("aux-") {
                if let Ok(view) = serde_json::from_value::<AuxiliaryView>(serde_json::json!(key)) {
                    if matches!(
                        view,
                        AuxiliaryView::Settings | AuxiliaryView::About | AuxiliaryView::Records
                    ) {
                        api.prevent_close();
                        let _ = conceal(window.app_handle(), view);
                        let _ = window.app_handle().emit_to(
                            "main",
                            "auxiliary-intent",
                            serde_json::json!({"view":key,"type":"close"}),
                        );
                    }
                }
            }
        }
        if matches!(event, tauri::WindowEvent::Destroyed) {
            if let Some(view) = window.label().strip_prefix("aux-") {
                let _ = window.app_handle().emit_to(
                    "main",
                    "auxiliary-intent",
                    serde_json::json!({"view":view,"type":"close"}),
                );
            }
        }
        return;
    }
    let hosting = window.state::<std::sync::Arc<crate::hosting::Hosting>>();
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        if hosting.running() || window.state::<crate::desktop::Desktop>().voice_active() {
            api.prevent_close();
            let _ = window.emit("desktop-command", "close");
        }
    }
    if matches!(event, tauri::WindowEvent::Destroyed) {
        hosting.stop();
    }
}
