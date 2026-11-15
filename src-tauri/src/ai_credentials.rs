use serde::Serialize;
use tauri::WebviewWindow;

const ENTRY: &str = "ai-provider-key";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiKeyStatus {
    has_key: bool,
}

fn allowed(window: &WebviewWindow) -> bool {
    matches!(window.label(), "main" | "aux-settings")
}

fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(crate::identity::APP_ID.as_str(), ENTRY)
        .map_err(|_| "无法访问系统凭据存储".into())
}

#[tauri::command]
pub fn ai_key_status(window: WebviewWindow) -> Result<AiKeyStatus, String> {
    if !allowed(&window) {
        return Err("该窗口不能读取 AI 凭据".into());
    }
    match entry()?.get_password() {
        Ok(value) => Ok(AiKeyStatus {
            has_key: !value.is_empty(),
        }),
        Err(keyring::Error::NoEntry) => Ok(AiKeyStatus { has_key: false }),
        Err(_) => Err("无法读取 AI 凭据，请检查系统凭据存储权限".into()),
    }
}

#[tauri::command]
pub fn ai_key_save(window: WebviewWindow, key: String) -> Result<(), String> {
    if !allowed(&window) {
        return Err("该窗口不能修改 AI 凭据".into());
    }
    let key = key.trim();
    if key.is_empty() || key.len() > 500 {
        return Err("API Key 无效".into());
    }
    entry()?
        .set_password(key)
        .map_err(|_| "无法保存 AI 凭据".into())
}

#[tauri::command]
pub fn ai_key_clear(window: WebviewWindow) -> Result<(), String> {
    if !allowed(&window) {
        return Err("该窗口不能修改 AI 凭据".into());
    }
    match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("无法清除 AI 凭据".into()),
    }
}

#[tauri::command]
pub fn ai_key_get(window: WebviewWindow) -> Result<String, String> {
    if window.label() != "main" {
        return Err("该窗口不能读取 AI 凭据".into());
    }
    match entry()?.get_password() {
        Ok(value) => Ok(value),
        Err(keyring::Error::NoEntry) => Ok(String::new()),
        Err(_) => Err("无法读取 AI 凭据，请检查系统凭据存储权限".into()),
    }
}
