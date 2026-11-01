use crate::usage_model::{PlayContext, UsageClock, UsageData, UsageSnapshot};
use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
pub struct Usage {
    clock: Mutex<UsageClock>,
    path: Mutex<Option<PathBuf>>,
    stopped: AtomicBool,
}
impl Default for Usage {
    fn default() -> Self {
        Self {
            clock: Mutex::new(UsageClock::new(UsageData::new(timestamp()))),
            path: Mutex::new(None),
            stopped: AtomicBool::new(false),
        }
    }
}
impl Usage {
    fn save(&self, clock: &UsageClock) -> Result<(), String> {
        if clock.error.is_some() {
            return Ok(());
        }
        let path = self
            .path
            .lock()
            .unwrap()
            .clone()
            .ok_or("统计目录尚未就绪")?;
        let temp = path.with_extension("pending");
        fs::write(
            &temp,
            serde_json::to_vec(&clock.data).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        fs::rename(temp, path).map_err(|e| e.to_string())
    }
}
pub fn init(app: &tauri::AppHandle) -> Result<(), String> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let path = root.join("usage.json");
    let state = app.state::<Usage>();
    match fs::read(&path) {
        Ok(bytes) => match serde_json::from_slice::<UsageData>(&bytes) {
            Ok(data) if data.format == 1 => *state.clock.lock().unwrap() = UsageClock::new(data),
            _ => {
                state.clock.lock().unwrap().error =
                    Some("使用统计读取失败，原文件已保留；可以备份后重置统计。".into())
            }
        },
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => state.clock.lock().unwrap().error = Some(error.to_string()),
    }
    *state.path.lock().unwrap() = Some(path);
    let handle = app.clone();
    std::thread::spawn(move || {
        let start = Instant::now();
        let mut last_wall = timestamp();
        let mut ticks = 0;
        loop {
            std::thread::sleep(Duration::from_secs(1));
            let state = handle.state::<Usage>();
            if state.stopped.load(Ordering::Relaxed) {
                break;
            }
            let windows = handle.webview_windows();
            let visible: Vec<String> = windows
                .values()
                .filter(|window| {
                    window.is_visible().unwrap_or(false) && !window.is_minimized().unwrap_or(true)
                })
                .map(|window| window.label().to_owned())
                .collect();
            let focused = windows
                .values()
                .find(|window| window.is_focused().unwrap_or(false))
                .map(|window| window.label().to_owned());
            let wall = timestamp();
            let suspended = wall.saturating_sub(last_wall) > 2500;
            last_wall = wall;
            let mut clock = state.clock.lock().unwrap();
            clock.sample(
                start.elapsed().as_millis() as u64,
                &visible,
                focused.as_deref(),
                suspended || screen_locked(),
            );
            clock
                .contexts
                .retain(|label, _| windows.contains_key(label));
            ticks += 1;
            if ticks % 15 == 0 {
                if let Err(error) = state.save(&clock) {
                    clock.error = Some(format!("统计保存失败：{error}"));
                }
            }
        }
    });
    Ok(())
}
pub fn stop(app: &tauri::AppHandle) {
    let state = app.state::<Usage>();
    state.stopped.store(true, Ordering::Relaxed);
    let clock = state.clock.lock().unwrap();
    let _ = state.save(&clock);
}
#[tauri::command]
pub fn usage_snapshot(state: tauri::State<'_, Usage>) -> UsageSnapshot {
    state.clock.lock().unwrap().snapshot()
}
#[tauri::command]
pub fn usage_context(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Usage>,
    context: Option<PlayContext>,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("该窗口不提供游玩计时".into());
    }
    let mut clock = state.clock.lock().unwrap();
    if let Some(context) = context {
        if context.game.len() > 40 || context.session.len() > 160 {
            return Err("计时场次无效".into());
        }
        clock.contexts.insert(window.label().into(), context);
    } else {
        clock.contexts.remove(window.label());
    }
    state.save(&clock)
}
#[tauri::command]
pub fn usage_enabled(
    state: tauri::State<'_, Usage>,
    enabled: bool,
) -> Result<UsageSnapshot, String> {
    let mut clock = state.clock.lock().unwrap();
    clock.data.enabled = enabled;
    state.save(&clock)?;
    Ok(clock.snapshot())
}
#[tauri::command]
pub fn usage_reset(state: tauri::State<'_, Usage>) -> Result<UsageSnapshot, String> {
    let mut clock = state.clock.lock().unwrap();
    if let Some(path) = state.path.lock().unwrap().as_ref() {
        if path.exists() {
            fs::copy(
                path,
                path.with_extension(format!("before-reset-{}.json", timestamp())),
            )
            .map_err(|e| e.to_string())?;
        }
    }
    let enabled = clock.data.enabled;
    let contexts = clock.contexts.clone();
    *clock = UsageClock::new(UsageData::new(timestamp()));
    clock.data.enabled = enabled;
    clock.contexts = contexts;
    state.save(&clock)?;
    Ok(clock.snapshot())
}
#[cfg(target_os = "macos")]
fn screen_locked() -> bool {
    use std::ffi::{c_char, c_void};
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGSessionCopyCurrentDictionary() -> *const c_void;
    }
    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFStringCreateWithCString(
            alloc: *const c_void,
            text: *const c_char,
            encoding: u32,
        ) -> *const c_void;
        fn CFDictionaryGetValue(dict: *const c_void, key: *const c_void) -> *const c_void;
        fn CFGetTypeID(value: *const c_void) -> usize;
        fn CFBooleanGetTypeID() -> usize;
        fn CFBooleanGetValue(value: *const c_void) -> u8;
        fn CFRelease(value: *const c_void);
    }
    unsafe {
        let dict = CGSessionCopyCurrentDictionary();
        if dict.is_null() {
            return true;
        }
        let key = CFStringCreateWithCString(
            std::ptr::null(),
            c"CGSSessionScreenIsLocked".as_ptr(),
            0x08000100,
        );
        let value = CFDictionaryGetValue(dict, key);
        let locked = !value.is_null()
            && CFGetTypeID(value) == CFBooleanGetTypeID()
            && CFBooleanGetValue(value) != 0;
        CFRelease(key);
        CFRelease(dict);
        locked
    }
}
#[cfg(target_os = "windows")]
fn screen_locked() -> bool {
    use std::ffi::c_void;
    #[link(name = "user32")]
    extern "system" {
        fn OpenInputDesktop(flags: u32, inherit: i32, access: u32) -> *mut c_void;
        fn GetUserObjectInformationW(
            object: *mut c_void,
            index: i32,
            data: *mut c_void,
            length: u32,
            needed: *mut u32,
        ) -> i32;
        fn CloseDesktop(desktop: *mut c_void) -> i32;
    }
    unsafe {
        let desktop = OpenInputDesktop(0, 0, 1);
        if desktop.is_null() {
            return true;
        }
        let mut name = [0u16; 256];
        let mut needed = 0;
        let success =
            GetUserObjectInformationW(desktop, 2, name.as_mut_ptr().cast(), 512, &mut needed) != 0;
        CloseDesktop(desktop);
        !success
            || !String::from_utf16_lossy(
                &name[..name.iter().position(|c| *c == 0).unwrap_or(name.len())],
            )
            .eq_ignore_ascii_case("Default")
    }
}
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn screen_locked() -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn persists_statistics_outside_cache_without_touching_other_data() {
        let root = std::env::temp_dir().join(format!(
            "onlinebg-usage-{}-{}",
            std::process::id(),
            timestamp()
        ));
        fs::create_dir_all(root.join("hosting")).unwrap();
        fs::write(root.join("voice.json"), "voice").unwrap();
        fs::write(root.join("save.json"), "save").unwrap();
        let usage = Usage::default();
        *usage.path.lock().unwrap() = Some(root.join("usage.json"));
        let mut clock = usage.clock.lock().unwrap();
        clock.sample(0, &["main".into()], None, false);
        clock.sample(1000, &["main".into()], None, false);
        usage.save(&clock).unwrap();
        crate::cache::remove_directory(&root.join("hosting")).unwrap();
        let data: UsageData =
            serde_json::from_slice(&fs::read(root.join("usage.json")).unwrap()).unwrap();
        assert_eq!(data.total_ms, 1000);
        assert_eq!(
            fs::read_to_string(root.join("voice.json")).unwrap(),
            "voice"
        );
        assert_eq!(fs::read_to_string(root.join("save.json")).unwrap(), "save");
        fs::remove_dir_all(root).unwrap();
    }
}
