use command_group::{CommandGroup, GroupChild};
use flate2::read::GzDecoder;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

#[derive(Default)]
pub struct Hosting {
    session: Mutex<Option<Session>>,
    starting: AtomicBool,
    generation: AtomicU64,
}

struct Process(GroupChild);
impl Drop for Process {
    fn drop(&mut self) { let _ = self.0.kill(); let _ = self.0.wait(); }
}
struct Session { _server: Process, _tunnel: Process, url: String }

#[derive(Deserialize)]
struct NodeRuntime { url: String, sha256: String, entry: String, format: String }
#[derive(Deserialize)]
struct TunnelRuntime { sha256: String }
#[derive(Deserialize)]
struct Runtime { node: NodeRuntime, cloudflared: TunnelRuntime, platform: String, arch: String }

impl Hosting {
    pub fn running(&self) -> bool { self.starting.load(Ordering::SeqCst) || self.session.lock().unwrap().is_some() }
    pub fn stop(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
        self.session.lock().unwrap().take();
    }
    pub fn clear_cache(&self, app: &tauri::AppHandle, runtime: bool, images: bool) -> Result<(), String> {
        if self.starting.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_err() { return Err("公网服务正在启动，请稍后清理".into()); }
        let result = (|| {
            if runtime && self.session.lock().unwrap().is_some() { return Err("请先关闭公网房间，再清理联机组件".into()); }
            if runtime { crate::cache::remove_directory(&crate::cache::runtime_path(app)?)?; }
            if images { crate::cache::remove_directory(&crate::cache::image_path(app)?)?; }
            Ok(())
        })();
        self.starting.store(false, Ordering::SeqCst);
        result
    }
    fn active(&self, generation: u64) -> Result<(), String> {
        if self.generation.load(Ordering::SeqCst) != generation { return Err("房间创建已取消".into()); }
        Ok(())
    }
    fn start(&self, app: &tauri::AppHandle) -> Result<String, String> {
        if let Some(session) = self.session.lock().unwrap().as_ref() { return Ok(session.url.clone()); }
        if self.starting.swap(true, Ordering::SeqCst) { return Err("房间正在准备".into()); }
        let generation = self.generation.load(Ordering::SeqCst);
        let result = self.prepare(app, generation);
        self.starting.store(false, Ordering::SeqCst);
        result
    }
    fn prepare(&self, app: &tauri::AppHandle, generation: u64) -> Result<String, String> {
        let resources = match std::env::var_os("COMPANION_HOST_RESOURCES") {
            Some(path) => PathBuf::from(path),
            None => if cfg!(debug_assertions) { PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/hosting") } else { app.path().resource_dir().map_err(|e| e.to_string())?.join("hosting") },
        };
        let cache = crate::cache::runtime_path(app)?;
        fs::create_dir_all(&cache).map_err(|e| e.to_string())?;
        let runtime: Runtime = serde_json::from_slice(&fs::read(resources.join("runtime.json")).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
        if runtime.platform != std::env::consts::OS || runtime.arch != std::env::consts::ARCH { return Err("该平台的联机组件尚未配置".into()); }
        let client = reqwest::blocking::Client::builder().timeout(Duration::from_secs(180)).build().map_err(|e| e.to_string())?;
        let extension = if cfg!(windows) { ".exe" } else { "" };
        let node = cache.join(format!("node-{}{extension}", &runtime.node.sha256[..16]));
        if !node.exists() {
            let _ = app.emit("hosting-status", "首次联机：正在下载运行组件");
            let response = client.get(&runtime.node.url).send().and_then(|r| r.error_for_status()).map_err(|e| format!("运行组件下载失败：{e}"))?;
            let bytes = response.bytes().map_err(|e| e.to_string())?;
            if format!("{:x}", Sha256::digest(&bytes)) != runtime.node.sha256 { return Err("运行组件校验失败".into()); }
            self.active(generation)?;
            let temporary = cache.join("node.download");
            let mut output = fs::File::create(&temporary).map_err(|e| e.to_string())?;
            match runtime.node.format.as_str() {
                "zip" => {
                    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(&bytes)).map_err(|e| e.to_string())?;
                    let mut entry = archive.by_name(&runtime.node.entry).map_err(|e| e.to_string())?;
                    std::io::copy(&mut entry, &mut output).map_err(|e| e.to_string())?;
                }
                "tar.gz" => {
                    let mut archive = tar::Archive::new(GzDecoder::new(&bytes[..]));
                    let mut extracted = false;
                    for entry in archive.entries().map_err(|e| e.to_string())? {
                        let mut entry = entry.map_err(|e| e.to_string())?;
                        if entry.path().map_err(|e| e.to_string())? == Path::new(&runtime.node.entry) {
                            std::io::copy(&mut entry, &mut output).map_err(|e| e.to_string())?;
                            extracted = true;
                            break;
                        }
                    }
                    if !extracted { return Err("运行组件中没有可执行文件".into()); }
                }
                _ => return Err("不支持的运行组件格式".into()),
            }
            drop(output);
            executable(&temporary)?;
            fs::rename(temporary, &node).map_err(|e| e.to_string())?;
        }
        self.active(generation)?;
        let tunnel = cache.join(format!("cloudflared-{}{extension}", &runtime.cloudflared.sha256[..16]));
        if !tunnel.exists() {
            let mut binary = Vec::new();
            GzDecoder::new(fs::File::open(resources.join("cloudflared.gz")).map_err(|e| e.to_string())?).read_to_end(&mut binary).map_err(|e| e.to_string())?;
            if format!("{:x}", Sha256::digest(&binary)) != runtime.cloudflared.sha256 { return Err("公网组件校验失败".into()); }
            let temporary = cache.join("cloudflared.download");
            fs::write(&temporary, binary).map_err(|e| e.to_string())?;
            executable(&temporary)?;
            fs::rename(temporary, &tunnel).map_err(|e| e.to_string())?;
        }
        let _ = app.emit("hosting-status", "正在启动房间服务");
        let mut command = Command::new(node);
        let data = match std::env::var_os("COMPANION_HOST_DATA") { Some(path) => PathBuf::from(path), None => app.path().app_data_dir().map_err(|e| e.to_string())?.join("rooms") };
        command.arg(resources.join("main.mjs")).env("DATA_ROOT", data).env("PORT", "0").env("HOST", "127.0.0.1").env("STATIC_ROOT", resources.join("web"));
        let (mut server, lines) = spawn(command)?;
        let deadline = Instant::now() + Duration::from_secs(30);
        let port = loop {
            self.active(generation)?;
            if let Some(code) = server.0.try_wait().map_err(|e| e.to_string())? { return Err(format!("房间服务退出：{code}")); }
            if Instant::now() > deadline { return Err("房间服务启动超时".into()); }
            if let Ok(line) = lines.recv_timeout(Duration::from_millis(200)) {
                if let Some(value) = line.strip_prefix("ROOM_READY ") {
                    let json: serde_json::Value = serde_json::from_str(value).map_err(|e| e.to_string())?;
                    break json["port"].as_u64().ok_or("房间端口无效")?;
                }
            }
        };
        let _ = app.emit("hosting-status", "正在建立临时公网入口");
        let mut command = Command::new(tunnel);
        command.args(["tunnel", "--url", &format!("http://127.0.0.1:{port}"), "--protocol", "http2", "--no-autoupdate"]);
        let (mut tunnel, lines) = spawn(command)?;
        let deadline = Instant::now() + Duration::from_secs(90);
        let mut url = String::new();
        loop {
            self.active(generation)?;
            if let Some(code) = tunnel.0.try_wait().map_err(|e| e.to_string())? { return Err(format!("公网入口启动失败：{code}")); }
            if Instant::now() > deadline { return Err("公网入口连接超时，请稍后再试".into()); }
            if let Ok(line) = lines.recv_timeout(Duration::from_millis(200)) {
                for word in line.split_whitespace() { if word.starts_with("https://") && word.ends_with(".trycloudflare.com") { url = word.into(); } }
                if !url.is_empty() && line.contains("Registered tunnel connection") { break; }
            }
        }
        let probe = reqwest::blocking::Client::builder().timeout(Duration::from_secs(8)).build().map_err(|e| e.to_string())?;
        let mut ready = false;
        for _ in 0..12 {
            self.active(generation)?;
            if probe.get(format!("{url}/health")).send().is_ok_and(|r| r.status().is_success()) { ready = true; break; }
            std::thread::sleep(Duration::from_millis(500));
        }
        if !ready { return Err("公网入口尚未可达，请稍后重试".into()); }
        let mut session = self.session.lock().unwrap();
        self.active(generation)?;
        *session = Some(Session { _server: server, _tunnel: tunnel, url: url.clone() });
        let _ = app.emit("hosting-status", "公网房间已准备");
        Ok(url)
    }
}

fn executable(path: &Path) -> Result<(), String> {
    #[cfg(unix)] {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
fn spawn(mut command: Command) -> Result<(Process, mpsc::Receiver<String>), String> {
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut group = command.group();
    #[cfg(windows)]
    group.creation_flags(0x08000000);
    let mut child = Process(group.spawn().map_err(|e| e.to_string())?);
    let (sender, receiver) = mpsc::channel();
    let stdout = child.0.inner().stdout.take().unwrap();
    let stderr = child.0.inner().stderr.take().unwrap();
    for pipe in [Box::new(stdout) as Box<dyn Read + Send>, Box::new(stderr) as Box<dyn Read + Send>] {
        let sender = sender.clone();
        std::thread::spawn(move || { for line in BufReader::new(pipe).lines().map_while(Result::ok) { let _ = sender.send(line); } });
    }
    Ok((child, receiver))
}

#[tauri::command]
pub async fn start_host(app: tauri::AppHandle, state: tauri::State<'_, Arc<Hosting>>) -> Result<String, String> {
    let hosting = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || hosting.start(&app)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn stop_host(state: tauri::State<'_, Arc<Hosting>>) { state.stop(); }

#[tauri::command]
pub fn clear_cache(app: tauri::AppHandle, state: tauri::State<'_, Arc<Hosting>>, runtime: bool, images: bool) -> Result<(), String> { state.clear_cache(&app, runtime, images) }

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn background_process_has_no_console() {
        let mut command = Command::new("powershell.exe");
        command.args(["-NoProfile", "-NonInteractive", "-Command", r#"Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class ConsoleProbe { [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow(); }'; [ConsoleProbe]::GetConsoleWindow().ToInt64()"#]);
        let (mut process, output) = spawn(command).expect("cannot spawn background process");
        assert!(process.0.wait().expect("cannot wait for background process").success());
        assert!(output.iter().any(|line| line.trim() == "0"));
    }
}
