#[cfg(target_os = "ios")]
use serde::Serialize;
use tauri::ipc::Channel;
#[cfg(target_os = "ios")]
use tauri::plugin::PluginHandle;
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Runtime};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_voice_native);

pub struct VoiceNative<R: Runtime> {
    #[cfg(target_os = "ios")]
    handle: PluginHandle<R>,
    #[cfg(not(target_os = "ios"))]
    marker: std::marker::PhantomData<fn() -> R>,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectArgs {
    url: String,
    token: String,
    muted: bool,
    on_event: Channel<serde_json::Value>,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
struct MicrophoneArgs {
    enabled: bool,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
struct DeafenArgs {
    enabled: bool,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
struct VolumeArgs {
    participant: String,
    volume: f64,
}

impl<R: Runtime> VoiceNative<R> {
    pub fn connect(
        &self,
        url: String,
        token: String,
        muted: bool,
        on_event: Channel<serde_json::Value>,
    ) -> Result<(), String> {
        #[cfg(target_os = "ios")]
        {
            self.handle
                .run_mobile_plugin::<serde_json::Value>(
                    "connect",
                    ConnectArgs {
                        url,
                        token,
                        muted,
                        on_event,
                    },
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }
        #[cfg(not(target_os = "ios"))]
        {
            let _ = (url, token, muted, on_event);
            Err("原生语音仅支持 iOS".into())
        }
    }

    pub fn set_microphone(&self, enabled: bool) -> Result<(), String> {
        #[cfg(target_os = "ios")]
        {
            self.handle
                .run_mobile_plugin::<serde_json::Value>("setMicrophone", MicrophoneArgs { enabled })
                .map(|_| ())
                .map_err(|error| error.to_string())
        }
        #[cfg(not(target_os = "ios"))]
        {
            let _ = enabled;
            Err("原生语音仅支持 iOS".into())
        }
    }

    pub fn set_deafened(&self, enabled: bool) -> Result<(), String> {
        #[cfg(target_os = "ios")]
        {
            self.handle
                .run_mobile_plugin::<serde_json::Value>("setDeafened", DeafenArgs { enabled })
                .map(|_| ())
                .map_err(|error| error.to_string())
        }
        #[cfg(not(target_os = "ios"))]
        {
            let _ = enabled;
            Err("原生语音仅支持 iOS".into())
        }
    }

    pub fn set_volume(&self, participant: String, volume: f64) -> Result<(), String> {
        #[cfg(target_os = "ios")]
        {
            self.handle
                .run_mobile_plugin::<serde_json::Value>(
                    "setVolume",
                    VolumeArgs {
                        participant,
                        volume,
                    },
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }
        #[cfg(not(target_os = "ios"))]
        {
            let _ = (participant, volume);
            Err("原生语音仅支持 iOS".into())
        }
    }

    pub fn playback(&self) -> Result<(), String> {
        #[cfg(target_os = "ios")]
        {
            self.handle
                .run_mobile_plugin::<serde_json::Value>("playback", ())
                .map(|_| ())
                .map_err(|error| error.to_string())
        }
        #[cfg(not(target_os = "ios"))]
        {
            Err("原生语音仅支持 iOS".into())
        }
    }

    pub fn disconnect(&self) -> Result<(), String> {
        #[cfg(target_os = "ios")]
        {
            self.handle
                .run_mobile_plugin::<serde_json::Value>("disconnect", ())
                .map(|_| ())
                .map_err(|error| error.to_string())
        }
        #[cfg(not(target_os = "ios"))]
        {
            Err("原生语音仅支持 iOS".into())
        }
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("voice-native")
        .setup(|app, api| {
            #[cfg(target_os = "ios")]
            {
                let handle = api.register_ios_plugin(init_plugin_voice_native)?;
                app.manage(VoiceNative { handle });
            }
            #[cfg(not(target_os = "ios"))]
            {
                let _ = (app, api);
                app.manage(VoiceNative::<R> {
                    marker: std::marker::PhantomData,
                });
            }
            Ok(())
        })
        .build()
}
