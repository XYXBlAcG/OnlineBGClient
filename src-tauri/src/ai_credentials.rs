use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::WebviewWindow;

const LEGACY_ENTRY: &str = "ai-provider-key";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiKeyStatus {
    has_key: bool,
}

fn allowed(window: &WebviewWindow) -> Result<(), String> {
    if matches!(window.label(), "main" | "aux-settings") {
        Ok(())
    } else {
        Err("该窗口不能访问 AI 凭据".into())
    }
}

fn entry(scope: &str) -> Result<keyring::Entry, String> {
    if scope.is_empty() || scope.len() > 500 {
        return Err("AI 凭据作用域无效".into());
    }
    let digest = Sha256::digest(scope.as_bytes());
    let name = format!("{LEGACY_ENTRY}:{digest:x}");
    keyring::Entry::new(crate::identity::APP_ID.as_str(), &name)
        .map_err(|_| "无法访问系统凭据存储".into())
}

fn read(entry: &keyring::Entry) -> Result<String, String> {
    match entry.get_password() {
        Ok(value) => Ok(value),
        Err(keyring::Error::NoEntry) => Ok(String::new()),
        Err(_) => Err("无法读取 AI 凭据，请检查系统凭据存储权限".into()),
    }
}

#[tauri::command]
pub fn ai_key_status(window: WebviewWindow, scope: String) -> Result<AiKeyStatus, String> {
    allowed(&window)?;
    Ok(AiKeyStatus {
        has_key: !read(&entry(&scope)?)?.is_empty(),
    })
}

#[tauri::command]
pub fn ai_key_save(window: WebviewWindow, scope: String, key: String) -> Result<(), String> {
    allowed(&window)?;
    let key = key.trim();
    if key.is_empty() || key.len() > 500 {
        return Err("API Key 无效".into());
    }
    entry(&scope)?
        .set_password(key)
        .map_err(|_| "无法保存 AI 凭据".into())
}

#[tauri::command]
pub fn ai_key_clear(
    window: WebviewWindow,
    scope: String,
    clear_legacy: Option<bool>,
) -> Result<(), String> {
    allowed(&window)?;
    match entry(&scope)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => {}
        Err(_) => return Err("无法清除 AI 凭据".into()),
    }
    if clear_legacy == Some(true) {
        let legacy = keyring::Entry::new(crate::identity::APP_ID.as_str(), LEGACY_ENTRY)
            .map_err(|_| "无法访问系统凭据存储".to_string())?;
        match legacy.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => {}
            Err(_) => return Err("无法清除历史 AI 凭据".into()),
        }
    }
    Ok(())
}

#[tauri::command]
pub fn ai_key_get(window: WebviewWindow, scope: String) -> Result<String, String> {
    if window.label() != "main" {
        return Err("该窗口不能读取 AI 凭据".into());
    }
    read(&entry(&scope)?)
}

#[tauri::command]
pub fn ai_key_migrate(window: WebviewWindow, scope: String) -> Result<(), String> {
    if window.label() != "main" {
        return Err("该窗口不能迁移 AI 凭据".into());
    }
    let legacy = keyring::Entry::new(crate::identity::APP_ID.as_str(), LEGACY_ENTRY)
        .map_err(|_| "无法访问系统凭据存储".to_string())?;
    let key = read(&legacy)?;
    if key.is_empty() {
        return Ok(());
    }
    let target = entry(&scope)?;
    if !read(&target)?.is_empty() {
        return Ok(());
    }
    target
        .set_password(&key)
        .map_err(|_| "无法迁移 AI 凭据，原凭据已保留".to_string())?;
    if read(&target)? != key {
        return Err("AI 凭据迁移验证失败，原凭据已保留".into());
    }
    legacy
        .delete_credential()
        .map_err(|_| "原凭据已保留，稍后可重试清理".into())
}
