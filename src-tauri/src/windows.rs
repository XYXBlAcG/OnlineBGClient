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
}
#[derive(Default)]
pub struct Windows {
    frames: Mutex<HashMap<String, Frame>>,
}
impl Windows {
    fn publish(&self, view: AuxiliaryView, payload: Value) -> Frame {
        let mut frames = self.frames.lock().unwrap();
        let label = view.label().to_string();
        let frame = Frame {
            revision: frames.get(&label).map_or(1, |old| old.revision + 1),
            payload,
        };
        frames.insert(label, frame.clone());
        frame
    }
}
#[tauri::command]
pub fn present_auxiliary(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<Windows>,
    view: AuxiliaryView,
    payload: Value,
    focus: bool,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("仅主窗口可以发布状态".into());
    }
    let frame = state.publish(view, payload);
    if let Some(child) = app.get_webview_window(view.label()) {
        child
            .emit("auxiliary-state", frame)
            .map_err(|e| e.to_string())?;
        if focus {
            child.show().map_err(|e| e.to_string())?;
            child.set_focus().map_err(|e| e.to_string())?;
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
    if let Some(child) = app.get_webview_window(view.label()) {
        child.close().map_err(|e| e.to_string())?;
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
        );
        let second = state.publish(AuxiliaryView::Settings, serde_json::json!({"theme":"dark"}));
        assert_eq!(second.revision, first.revision + 1);
        assert_eq!(state.frames.lock().unwrap().len(), 1);
        assert_eq!(second.payload["theme"], "dark");
    }
}

pub fn window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if window.label() != "main" {
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
        if hosting.running() {
            api.prevent_close();
            let _ = window.emit("desktop-command", "close");
        }
    }
    if matches!(event, tauri::WindowEvent::Destroyed) {
        hosting.stop();
    }
}
