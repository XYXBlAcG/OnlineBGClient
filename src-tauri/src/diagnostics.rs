use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::Manager;

struct RollingFile {
    path: PathBuf,
    file: File,
    size: u64,
}
impl RollingFile {
    fn open(path: PathBuf) -> std::io::Result<Self> {
        let file = OpenOptions::new().create(true).append(true).open(&path)?;
        let size = file.metadata()?.len();
        Ok(Self { path, file, size })
    }
    fn clear(&mut self) -> std::io::Result<()> {
        self.file.flush()?;
        for path in [
            self.path.with_extension("log.1"),
            self.path.with_extension("log.2"),
        ] {
            match fs::remove_file(path) {
                Ok(()) => {}
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                Err(error) => return Err(error),
            }
        }
        self.reset()
    }
    fn reset(&mut self) -> std::io::Result<()> {
        self.file = OpenOptions::new()
            .write(true)
            .truncate(true)
            .open(&self.path)?;
        self.size = 0;
        Ok(())
    }
    fn append(&mut self, line: &str, limit: u64) -> std::io::Result<()> {
        if self.size + line.len() as u64 > limit {
            self.file.flush()?;
            let older = self.path.with_extension("log.2");
            if older.exists() {
                fs::remove_file(&older)?;
            }
            let previous = self.path.with_extension("log.1");
            if previous.exists() {
                fs::rename(&previous, &older)?;
            }
            fs::copy(&self.path, &previous)?;
            self.reset()?;
        }
        self.file.write_all(line.as_bytes())?;
        self.file.flush()?;
        self.size += line.len() as u64;
        Ok(())
    }
}
struct Logger(Arc<Mutex<RollingFile>>);
impl log::Log for Logger {
    fn enabled(&self, metadata: &log::Metadata) -> bool {
        metadata.target().starts_with("onlinebg") || metadata.level() <= log::Level::Warn
    }
    fn log(&self, record: &log::Record) {
        if !self.enabled(record.metadata()) {
            return;
        }
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        let message = redact(&record.args().to_string());
        let line = serde_json::json!({"atMs": now,"level":record.level().to_string(),"source":record.target(),"message":message}).to_string() + "\n";
        if let Ok(mut file) = self.0.lock() {
            let _ = file.append(&line, 2 * 1024 * 1024);
        }
    }
    fn flush(&self) {
        if let Ok(mut file) = self.0.lock() {
            let _ = file.file.flush();
        }
    }
}
pub struct LogState(Arc<Mutex<RollingFile>>);

pub fn redact(value: &str) -> String {
    let cleaned = value
        .split_whitespace()
        .map(|part| {
            if part.contains("://") {
                part.split(['?', '#']).next().unwrap_or(part)
            } else {
                part
            }
        })
        .collect::<Vec<_>>()
        .join(" ");
    let lowered = cleaned.to_lowercase();
    if [
        "secret",
        "password",
        "authorization",
        "api_key",
        "apikey",
        "token=",
        "\"token\"",
        "credential",
    ]
    .iter()
    .any(|key| lowered.contains(key))
    {
        return "[含凭据的日志已隐藏]".into();
    }
    cleaned.chars().take(4000).collect()
}

pub fn init(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let dir = app.path().app_log_dir()?;
    fs::create_dir_all(&dir)?;
    let path = dir.join("client.log");
    let writer = Arc::new(Mutex::new(RollingFile::open(path)?));
    let logger = Logger(writer.clone());
    log::set_boxed_logger(Box::new(logger))?;
    log::set_max_level(log::LevelFilter::Info);
    app.manage(LogState(writer));
    log::info!(target:"onlinebg::app", "executable={:?}",std::env::current_exe());
    log::info!(target:"onlinebg::app", "OnlineBGClient {} {} {}", app.package_info().version, std::env::consts::OS, std::env::consts::ARCH);
    Ok(())
}

#[tauri::command]
pub fn record_log(
    window: tauri::WebviewWindow,
    source: String,
    message: String,
) -> Result<(), String> {
    if window.label() != "main" && !window.label().starts_with("aux-") {
        return Err("该窗口不能写入日志".into());
    }
    if source.len() > 64 || message.len() > 16000 {
        return Err("日志过长".into());
    }
    log::info!(target:"onlinebg::client", "{} {} {}", window.label(), source, redact(&message));
    Ok(())
}
#[tauri::command]
pub fn application_logs(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, LogState>,
    full: bool,
) -> Result<String, String> {
    if window.label() != "main" && window.label() != "aux-settings" {
        return Err("请在设置中查看日志".into());
    }
    let mut writer = state.0.lock().map_err(|e| e.to_string())?;
    writer.file.flush().map_err(|e| e.to_string())?;
    let path = &writer.path;
    let mut output = String::new();
    for path in [
        path.with_extension("log.2"),
        path.with_extension("log.1"),
        path.clone(),
    ] {
        match fs::read_to_string(path) {
            Ok(value) => output.push_str(&value),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.to_string()),
        }
    }
    if !full {
        output = output
            .lines()
            .rev()
            .take(300)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect::<Vec<_>>()
            .join("\n");
    }
    Ok(output)
}

#[tauri::command]
pub fn clear_application_logs(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, LogState>,
) -> Result<(), String> {
    if window.label() != "main" && window.label() != "aux-settings" {
        return Err("请在设置中清除日志".into());
    }
    state
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .clear()
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn strips_credentials_and_room_parameters() {
        assert_eq!(
            redact("failed https://example.com/?room=abc#secret-room"),
            "failed https://example.com/"
        );
        assert!(!redact("authorization Bearer abc").contains("abc"));
    }
    #[test]
    fn rotates_and_keeps_bounded_history() {
        let dir = std::env::temp_dir().join(format!("companion-logs-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("client.log");
        let mut file = RollingFile::open(path.clone()).unwrap();
        for _ in 0..8 {
            file.append("12345\n", 8).unwrap();
        }
        drop(file);
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 3);
        assert_eq!(fs::read_to_string(path).unwrap(), "12345\n");
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn clear_removes_rotated_history_and_resets_cursor_for_future_writes() {
        let dir = std::env::temp_dir().join(format!("onlinebg-clear-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("client.log");
        let mut file = RollingFile::open(path.clone()).unwrap();
        for _ in 0..4 {
            file.append("12345\n", 8).unwrap();
        }
        file.clear().unwrap();
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 1);
        assert_eq!(fs::read_to_string(&path).unwrap(), "");
        assert_eq!(file.size, 0);
        file.append("fresh\n", 8).unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "fresh\n");
        file.clear().unwrap();
        file.clear().unwrap();
        file.append("next\n", 8).unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "next\n");
        drop(file);
        fs::remove_dir_all(dir).unwrap();
    }
}
