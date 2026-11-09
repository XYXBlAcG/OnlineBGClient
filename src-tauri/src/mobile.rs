use tauri::ipc::Channel;
use tauri::{State, Wry};
use tauri_plugin_voice_native::VoiceNative;

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?.build()?;
    Ok(())
}

#[tauri::command]
pub fn voice_native_connect(
    voice: State<'_, VoiceNative<Wry>>,
    url: String,
    token: String,
    muted: bool,
    on_event: Channel<serde_json::Value>,
) -> Result<(), String> {
    voice.connect(url, token, muted, on_event)
}

#[tauri::command]
pub fn voice_native_set_microphone(
    voice: State<'_, VoiceNative<Wry>>,
    enabled: bool,
) -> Result<(), String> {
    voice.set_microphone(enabled)
}

#[tauri::command]
pub fn voice_native_set_deafened(
    voice: State<'_, VoiceNative<Wry>>,
    enabled: bool,
) -> Result<(), String> {
    voice.set_deafened(enabled)
}

#[tauri::command]
pub fn voice_native_set_volume(
    voice: State<'_, VoiceNative<Wry>>,
    participant: String,
    volume: f64,
) -> Result<(), String> {
    voice.set_volume(participant, volume)
}

#[tauri::command]
pub fn voice_native_playback(voice: State<'_, VoiceNative<Wry>>) -> Result<(), String> {
    voice.playback()
}

#[tauri::command]
pub fn voice_native_disconnect(voice: State<'_, VoiceNative<Wry>>) -> Result<(), String> {
    voice.disconnect()
}
