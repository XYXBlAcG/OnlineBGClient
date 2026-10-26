use serde::{Deserialize, Serialize};
use tauri::{Manager, WebviewWindow};

#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceConfig {
    pub url: String,
    pub api_key: String,
    pub secret: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceConfigView {
    url: String,
    api_key: String,
    has_secret: bool,
}
fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new("cn.hullqin.companion", "livekit-host")
        .map_err(|_| "无法访问系统凭据存储".into())
}
pub fn load() -> Result<Option<VoiceConfig>, String> {
    match entry()?.get_password() {
        Ok(value) => serde_json::from_str(&value)
            .map(Some)
            .map_err(|_| "语音配置损坏，请重新保存".into()),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("无法读取语音凭据，请检查系统凭据存储权限".into()),
    }
}
#[tauri::command]
pub fn voice_config(window: WebviewWindow) -> Result<VoiceConfigView, String> {
    if window.label() != "main" && window.label() != "aux-settings" {
        return Err("该窗口不能读取语音配置".into());
    }
    let config = load()?.unwrap_or_default();
    Ok(VoiceConfigView {
        url: config.url,
        api_key: config.api_key,
        has_secret: !config.secret.is_empty(),
    })
}
#[tauri::command]
pub fn voice_save_config(
    window: WebviewWindow,
    mut config: VoiceConfig,
    clear: bool,
) -> Result<(), String> {
    if window.label() != "main" && window.label() != "aux-settings" {
        return Err("该窗口不能修改语音配置".into());
    }
    if clear {
        return match entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err("清除语音凭据失败".into()),
        };
    }
    let url = reqwest::Url::parse(config.url.trim()).map_err(|_| "语音地址格式无效")?;
    if url.scheme() != "wss"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("请输入 wss:// 开头的 LiveKit 项目地址".into());
    }
    config.url = url.to_string().trim_end_matches('/').to_string();
    config.api_key = config.api_key.trim().to_string();
    if config.secret.is_empty() {
        config.secret = load()?.map(|old| old.secret).unwrap_or_default();
    }
    if config.api_key.is_empty() || config.secret.len() < 16 {
        return Err("请填写项目 API Key 和有效的 Secret".into());
    }
    let value = serde_json::to_string(&config).map_err(|_| "语音配置保存失败")?;
    entry()?
        .set_password(&value)
        .map_err(|_| "无法保存到系统凭据存储".into())
}
#[tauri::command]
pub async fn voice_request(
    window: WebviewWindow,
    endpoint: String,
    room: String,
    token: String,
    operation: serde_json::Value,
) -> Result<serde_json::Value, String> {
    if window.label() != "main" {
        return Err("只有主窗口可以建立语音会话".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let mut url = reqwest::Url::parse(&endpoint).map_err(|_| "游戏服务地址格式无效")?;
        if !["https", "http"].contains(&url.scheme()) {
            return Err("游戏服务须使用 HTTP 或 HTTPS".into());
        }
        url.set_path("/voice");
        url.set_query(None);
        url.query_pairs_mut().append_pair("room", &room);
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|_| "语音请求初始化失败")?;
        let response = client
            .post(url)
            .bearer_auth(token)
            .header("Content-Type", "application/json")
            .body(operation.to_string())
            .send()
            .map_err(|_| "连接房主语音服务失败，请检查网络")?;
        let success = response.status().is_success();
        let value: serde_json::Value =
            serde_json::from_str(&response.text().map_err(|_| "读取语音响应失败")?)
                .map_err(|_| "房主服务版本不支持语音，请更新并重启房间服务")?;
        if !success {
            return Err(value["error"]
                .as_str()
                .unwrap_or("语音操作失败")
                .to_string());
        }
        Ok(value)
    })
    .await
    .map_err(|_| "语音请求任务失败".to_string())?
}
#[tauri::command]
pub fn voice_active(
    app: tauri::AppHandle,
    window: WebviewWindow,
    active: bool,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("只有主窗口可以设置通话状态".into());
    }
    app.state::<crate::desktop::Desktop>().set_voice(active);
    Ok(())
}
