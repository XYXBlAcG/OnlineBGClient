use crate::network_proxy::{self, EdgeRelay, HttpProxy};
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
    service: Mutex<Option<LocalService>>,
    starting: AtomicBool,
    generation: AtomicU64,
}

struct Process(GroupChild);
impl Drop for Process {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}
struct Session {
    _tunnel: Process,
    _relay: Option<EdgeRelay>,
    _api: Option<crate::quick_api::QuickApi>,
    url: String,
}
struct LocalService {
    _server: Process,
    endpoint: String,
    lan: bool,
    addresses: Vec<String>,
    resources: PathBuf,
    cache: PathBuf,
    tunnel_sha: String,
}

#[derive(Deserialize)]
struct NodeRuntime {
    url: String,
    sha256: String,
    entry: String,
    format: String,
}
#[derive(Deserialize)]
struct TunnelRuntime {
    sha256: String,
}
#[derive(Deserialize)]
struct Runtime {
    node: NodeRuntime,
    cloudflared: TunnelRuntime,
    platform: String,
    arch: String,
}

impl Hosting {
    pub fn running(&self) -> bool {
        self.starting.load(Ordering::SeqCst) || self.service.lock().unwrap().is_some()
    }
    pub fn stop(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
        self.session.lock().unwrap().take();
        self.service.lock().unwrap().take();
    }
    pub fn clear_cache(
        &self,
        app: &tauri::AppHandle,
        runtime: bool,
        images: bool,
    ) -> Result<(), String> {
        if self
            .starting
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err("公网服务正在启动，请稍后清理".into());
        }
        let result = (|| {
            if runtime && self.service.lock().unwrap().is_some() {
                return Err("请先关闭公网房间，再清理联机组件".into());
            }
            if runtime {
                crate::cache::remove_directory(&crate::cache::runtime_path(app)?)?;
            }
            if images {
                crate::cache::remove_directory(&crate::cache::image_path(app)?)?;
            }
            Ok(())
        })();
        self.starting.store(false, Ordering::SeqCst);
        result
    }
    fn active(&self, generation: u64) -> Result<(), String> {
        if self.generation.load(Ordering::SeqCst) != generation {
            return Err("房间创建已取消".into());
        }
        Ok(())
    }
    fn start(
        &self,
        app: &tauri::AppHandle,
        proxy: Option<String>,
        lan: bool,
    ) -> Result<String, String> {
        if lan {
            return self.start_lan(app);
        }
        let proxy = proxy.as_deref().map(HttpProxy::parse).transpose()?;
        if let Some(session) = self.session.lock().unwrap().as_ref() {
            return Ok(session.url.clone());
        }
        if self.starting.swap(true, Ordering::SeqCst) {
            return Err("房间正在准备".into());
        }
        let generation = self.generation.load(Ordering::SeqCst);
        let result = crate::hosting_retry::StartupRetry::run(
            || self.active(generation),
            |attempt| {
                let _ = app.emit(
                    "hosting-status",
                    format!(
                        "正在准备公网房间（第 {attempt}/{} 次）",
                        crate::hosting_retry::StartupRetry::ATTEMPTS
                    ),
                );
                let route =
                    if crate::hosting_retry::StartupRetry::use_proxy(attempt, proxy.is_some()) {
                        proxy.as_ref()
                    } else {
                        None
                    };
                log::info!(target:"onlinebg::hosting", "attempt={attempt} route={}", if route.is_some() { "proxy" } else { "direct" });
                self.prepare(app, generation, attempt, route, proxy.as_ref())
            },
        );
        if let Err(error) = &result {
            log::error!(target:"onlinebg::hosting", "{error}");
        }
        if result.is_err() {
            self.service.lock().unwrap().take();
        }
        self.starting.store(false, Ordering::SeqCst);
        result
    }
    fn start_lan(&self, app: &tauri::AppHandle) -> Result<String, String> {
        if self.starting.swap(true, Ordering::SeqCst) {
            return Err("房间正在准备".into());
        }
        let generation = self.generation.load(Ordering::SeqCst);
        let result = (|| {
            let mut service = self.service.lock().unwrap();
            if let Some(local) = service.as_ref() {
                if !local.lan {
                    return Err("请先关闭当前公网房间，再启动局域网调试".into());
                }
                return local
                    .addresses
                    .first()
                    .cloned()
                    .ok_or("未找到局域网地址".into());
            }
            let local = self.start_service(app, generation, true, true, None)?;
            let address = local
                .addresses
                .first()
                .cloned()
                .ok_or("未找到可用的局域网 IPv4 地址，请先连接 Wi-Fi 或有线网络")?;
            log::info!(target:"onlinebg::hosting", "LAN ready: {}", local.addresses.join(", "));
            *service = Some(local);
            let _ = app.emit("hosting-status", format!("局域网调试服务已准备：{address}"));
            Ok(address)
        })();
        self.starting.store(false, Ordering::SeqCst);
        result
    }
    fn abandon_run(
        &self,
        app: &tauri::AppHandle,
        run: String,
        token: String,
    ) -> Result<(), String> {
        if self.starting.swap(true, Ordering::SeqCst) {
            return Err("服务正在处理其他操作，请稍后重试".into());
        }
        let generation = self.generation.load(Ordering::SeqCst);
        let result = (|| {
            let service = self.service.lock().unwrap();
            match service.as_ref() {
                Some(local) => abandon_at(&local.endpoint, run, token),
                None => {
                    let temporary = self.start_service(app, generation, false, false, None)?;
                    abandon_at(&temporary.endpoint, run, token)
                }
            }
        })();
        self.starting.store(false, Ordering::SeqCst);
        result
    }
    fn start_service(
        &self,
        app: &tauri::AppHandle,
        generation: u64,
        interactive: bool,
        lan: bool,
        proxy: Option<&HttpProxy>,
    ) -> Result<LocalService, String> {
        let resources = match std::env::var_os("COMPANION_HOST_RESOURCES") {
            Some(path) => PathBuf::from(path),
            None => {
                if cfg!(debug_assertions) {
                    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/hosting")
                } else {
                    app.path()
                        .resource_dir()
                        .map_err(|e| e.to_string())?
                        .join("hosting")
                }
            }
        };
        let cache = crate::cache::runtime_path(app)?;
        fs::create_dir_all(&cache).map_err(|e| e.to_string())?;
        let runtime: Runtime = serde_json::from_slice(
            &fs::read(resources.join("runtime.json")).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        if runtime.platform != std::env::consts::OS || runtime.arch != std::env::consts::ARCH {
            return Err("该平台的联机组件尚未配置".into());
        }
        let client = network_proxy::client(proxy, Duration::from_secs(60))?;
        let extension = if cfg!(windows) { ".exe" } else { "" };
        let node = cache.join(format!("node-{}{extension}", &runtime.node.sha256[..16]));
        if !node.exists() {
            if interactive {
                let _ = app.emit("hosting-status", "首次联机：正在下载运行组件");
            }
            let response = client
                .get(&runtime.node.url)
                .send()
                .and_then(|r| r.error_for_status())
                .map_err(|e| format!("运行组件下载失败：{e}"))?;
            let bytes = response.bytes().map_err(|e| e.to_string())?;
            if format!("{:x}", Sha256::digest(&bytes)) != runtime.node.sha256 {
                return Err("运行组件校验失败".into());
            }
            self.active(generation)?;
            let temporary = cache.join("node.download");
            let mut output = fs::File::create(&temporary).map_err(|e| e.to_string())?;
            match runtime.node.format.as_str() {
                "zip" => {
                    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(&bytes))
                        .map_err(|e| e.to_string())?;
                    let mut entry = archive
                        .by_name(&runtime.node.entry)
                        .map_err(|e| e.to_string())?;
                    std::io::copy(&mut entry, &mut output).map_err(|e| e.to_string())?;
                }
                "tar.gz" => {
                    let mut archive = tar::Archive::new(GzDecoder::new(&bytes[..]));
                    let mut extracted = false;
                    for entry in archive.entries().map_err(|e| e.to_string())? {
                        let mut entry = entry.map_err(|e| e.to_string())?;
                        if entry.path().map_err(|e| e.to_string())?
                            == Path::new(&runtime.node.entry)
                        {
                            std::io::copy(&mut entry, &mut output).map_err(|e| e.to_string())?;
                            extracted = true;
                            break;
                        }
                    }
                    if !extracted {
                        return Err("运行组件中没有可执行文件".into());
                    }
                }
                _ => return Err("不支持的运行组件格式".into()),
            }
            drop(output);
            executable(&temporary)?;
            fs::rename(temporary, &node).map_err(|e| e.to_string())?;
        }
        self.active(generation)?;
        if interactive {
            let _ = app.emit("hosting-status", "正在启动房间服务");
        }
        let mut command = Command::new(node);
        let data = match std::env::var_os("COMPANION_HOST_DATA") {
            Some(path) => PathBuf::from(path),
            None => app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("rooms"),
        };
        command
            .arg(resources.join("main.mjs"))
            .env("DATA_ROOT", data)
            .env("PORT", "0")
            .env("HOST", if lan { "0.0.0.0" } else { "127.0.0.1" })
            .env("STATIC_ROOT", resources.join("web"));
        if interactive {
            match crate::voice::load() {
                Ok(Some(config)) => {
                    command
                        .env("LIVEKIT_URL", config.url)
                        .env("LIVEKIT_API_KEY", config.api_key)
                        .env("LIVEKIT_API_SECRET", config.secret);
                }
                Ok(None) => {}
                Err(message) => {
                    let _ = app.emit("voice-config-error", message);
                }
            }
        }
        let (mut server, lines) = spawn(command)?;
        let deadline = Instant::now() + Duration::from_secs(30);
        let (port, addresses) = loop {
            self.active(generation)?;
            if let Some(code) = server.0.try_wait().map_err(|e| e.to_string())? {
                return Err(format!("房间服务退出：{code}"));
            }
            if Instant::now() > deadline {
                return Err("房间服务启动超时".into());
            }
            if let Ok(line) = lines.recv_timeout(Duration::from_millis(200)) {
                if let Some(value) = line.strip_prefix("ROOM_READY ") {
                    let json: serde_json::Value =
                        serde_json::from_str(value).map_err(|e| e.to_string())?;
                    let port = json["port"].as_u64().ok_or("房间端口无效")?;
                    let addresses: Vec<String> = serde_json::from_value(json["addresses"].clone())
                        .map_err(|e| e.to_string())?;
                    break (port, addresses);
                }
            }
        };
        Ok(LocalService {
            _server: server,
            endpoint: format!("http://127.0.0.1:{port}"),
            lan,
            addresses,
            resources,
            cache,
            tunnel_sha: runtime.cloudflared.sha256,
        })
    }
    fn prepare(
        &self,
        app: &tauri::AppHandle,
        generation: u64,
        attempt: usize,
        proxy: Option<&HttpProxy>,
        fallback: Option<&HttpProxy>,
    ) -> Result<String, String> {
        let mut service = self.service.lock().unwrap();
        if service.is_none() {
            *service = Some(self.start_service(app, generation, true, false, proxy)?);
        }
        let local = service.as_ref().unwrap();
        if local.lan {
            return Err("请先关闭当前局域网房间，再启动公网服务".into());
        }
        let resources = &local.resources;
        let cache = &local.cache;
        let extension = if cfg!(windows) { ".exe" } else { "" };
        let tunnel = cache.join(format!(
            "cloudflared-{}{extension}",
            &local.tunnel_sha[..16]
        ));
        if !tunnel.exists() {
            let mut binary = Vec::new();
            GzDecoder::new(
                fs::File::open(resources.join("cloudflared.gz")).map_err(|e| e.to_string())?,
            )
            .read_to_end(&mut binary)
            .map_err(|e| e.to_string())?;
            if format!("{:x}", Sha256::digest(&binary)) != local.tunnel_sha {
                return Err("公网组件校验失败".into());
            }
            let temporary = cache.join("cloudflared.download");
            fs::write(&temporary, binary).map_err(|e| e.to_string())?;
            executable(&temporary)?;
            fs::rename(temporary, &tunnel).map_err(|e| e.to_string())?;
        }
        let _ = app.emit(
            "hosting-status",
            format!(
                "正在建立临时公网入口（第 {attempt}/{} 次）",
                crate::hosting_retry::StartupRetry::ATTEMPTS
            ),
        );
        let relay = proxy.map(EdgeRelay::start).transpose()?;
        let api = proxy.map(crate::quick_api::QuickApi::start).transpose()?;
        if proxy.is_some() {
            let _ = app.emit(
                "hosting-status",
                format!("直连未成功，正在通过代理建立公网入口（{attempt}/3）"),
            );
        }
        let mut command = Command::new(tunnel);
        command.args([
            "tunnel",
            "--url",
            &local.endpoint,
            "--protocol",
            "http2",
            "--no-autoupdate",
        ]);
        for key in [
            "HTTP_PROXY",
            "HTTPS_PROXY",
            "ALL_PROXY",
            "http_proxy",
            "https_proxy",
            "all_proxy",
        ] {
            command.env_remove(key);
        }
        command.env("NO_PROXY", "localhost,127.0.0.1,::1");
        if let Some(proxy) = proxy {
            command
                .env("HTTP_PROXY", &proxy.url)
                .env("HTTPS_PROXY", &proxy.url);
        }
        if let Some(api) = &api {
            command.args(["--quick-service", &api.endpoint]);
        }
        if let Some(relay) = &relay {
            for address in &relay.addresses {
                command.args(["--edge", address]);
            }
            command.arg("--no-prechecks");
        }
        let (mut tunnel, lines) = spawn(command)?;
        let deadline = Instant::now() + Duration::from_secs(35);
        let mut url = String::new();
        let mut last_error = String::new();
        loop {
            self.active(generation)?;
            if let Some(code) = tunnel.0.try_wait().map_err(|e| e.to_string())? {
                return Err(format!("公网入口启动失败：{code}"));
            }
            if Instant::now() > deadline {
                return Err(format!(
                    "公网入口连接超时：{last_error}。请在设置中查看软件日志"
                ));
            }
            if let Ok(line) = lines.recv_timeout(Duration::from_millis(200)) {
                if line.contains("ERR") || line.contains("error=") {
                    last_error = crate::diagnostics::redact(&line);
                }
                for word in line.split_whitespace() {
                    if word.starts_with("https://") && word.ends_with(".trycloudflare.com") {
                        url = word.into();
                    }
                }
                if !url.is_empty() && line.contains("Registered tunnel connection") {
                    break;
                }
            }
        }
        let mut routes = vec![(
            "direct",
            network_proxy::client(None, Duration::from_secs(4))?,
        )];
        if let Some(proxy) = fallback {
            routes.push((
                "proxy",
                network_proxy::client(Some(proxy), Duration::from_secs(4))?,
            ));
        }
        let _ = app.emit("hosting-status", "隧道已建立，正在验证公网访问");
        crate::hosting_probe::wait_ready(&url, &routes, Duration::from_secs(30), || {
            self.active(generation)?;
            if let Some(code) = tunnel.0.try_wait().map_err(|e| e.to_string())? {
                return Err(format!("公网入口启动失败：{code}"));
            }
            Ok(())
        })?;
        let mut session = self.session.lock().unwrap();
        self.active(generation)?;
        *session = Some(Session {
            _tunnel: tunnel,
            _relay: relay,
            _api: api,
            url: url.clone(),
        });
        let _ = app.emit("hosting-status", "公网房间已准备");
        Ok(url)
    }
}

fn abandon_at(endpoint: &str, run: String, token: String) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .post(format!("{endpoint}/runs/abandon"))
        .header("Content-Type", "application/json")
        .body(serde_json::json!({"type":"abandon-run","run":run,"token":token}).to_string())
        .send()
        .map_err(|_| "存档维护服务暂不可达".to_string())?;
    let status = response.status();
    let text = response.text().map_err(|e| e.to_string())?;
    let result: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    if !status.is_success() || result["type"] != "run-abandoned" {
        return Err(result["error"]
            .as_str()
            .unwrap_or("放弃远征失败")
            .to_string());
    }
    Ok(())
}
#[tauri::command]
pub async fn abandon_hosted_run(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Arc<Hosting>>,
    run: String,
    token: String,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("该窗口不能管理远征存档".into());
    }
    let hosting = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || hosting.abandon_run(&app, run, token))
        .await
        .map_err(|e| e.to_string())?
}

fn executable(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
fn spawn(mut command: Command) -> Result<(Process, mpsc::Receiver<String>), String> {
    let program = command.get_program().to_string_lossy().into_owned();
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut group = command.group();
    #[cfg(windows)]
    group.creation_flags(0x08000000);
    let mut child = Process(group.spawn().map_err(|e| e.to_string())?);
    let (sender, receiver) = mpsc::channel();
    let stdout = child.0.inner().stdout.take().unwrap();
    let stderr = child.0.inner().stderr.take().unwrap();
    for pipe in [
        Box::new(stdout) as Box<dyn Read + Send>,
        Box::new(stderr) as Box<dyn Read + Send>,
    ] {
        let sender = sender.clone();
        let program = program.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(pipe).lines().map_while(Result::ok) {
                log::info!(target:"onlinebg::process", "{program}: {line}");
                let _ = sender.send(line);
            }
        });
    }
    Ok((child, receiver))
}

#[tauri::command]
pub async fn start_host(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<Hosting>>,
    proxy: Option<String>,
    lan: Option<bool>,
) -> Result<String, String> {
    let hosting = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || hosting.start(&app, proxy, lan.unwrap_or(false)))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn host_endpoint(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Arc<Hosting>>,
) -> Result<String, String> {
    if window.label() != "main" {
        return Err("该窗口不能读取房间服务".into());
    }
    state
        .service
        .lock()
        .unwrap()
        .as_ref()
        .map(|service| service.endpoint.clone())
        .ok_or("房间服务尚未启动".into())
}

#[tauri::command]
pub fn stop_host(state: tauri::State<'_, Arc<Hosting>>) {
    state.stop();
}

#[tauri::command]
pub fn clear_cache(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<Hosting>>,
    runtime: bool,
    images: bool,
) -> Result<(), String> {
    state.clear_cache(&app, runtime, images)
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn background_process_has_no_console() {
        let mut command = Command::new("powershell.exe");
        command.args(["-NoProfile", "-NonInteractive", "-Command", r#"Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class ConsoleProbe { [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow(); }'; [ConsoleProbe]::GetConsoleWindow().ToInt64()"#]);
        let (mut process, output) = spawn(command).expect("cannot spawn background process");
        assert!(process
            .0
            .wait()
            .expect("cannot wait for background process")
            .success());
        assert!(output.iter().any(|line| line.trim() == "0"));
    }
}

#[tauri::command]
pub fn hosting_info(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Arc<Hosting>>,
) -> Result<serde_json::Value, String> {
    if window.label() != "main" {
        return Err("该窗口不能读取本机服务".into());
    }
    let public = state
        .session
        .lock()
        .unwrap()
        .as_ref()
        .map(|session| session.url.clone());
    let service = state.service.lock().unwrap();
    let local = service.as_ref().ok_or("本机服务尚未启动")?;
    Ok(
        serde_json::json!({"endpoint":local.endpoint,"invitation":public.clone().or_else(||local.addresses.first().cloned()).unwrap_or_else(||local.endpoint.clone()),"public":public.is_some()}),
    )
}
