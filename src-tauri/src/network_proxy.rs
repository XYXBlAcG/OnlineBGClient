use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{Shutdown, TcpListener, TcpStream, ToSocketAddrs};
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct HttpProxy {
    pub url: String,
    host: String,
    port: u16,
}
impl HttpProxy {
    pub fn parse(value: &str) -> Result<Self, String> {
        let value = if value.contains("://") {
            value.to_string()
        } else {
            format!("http://{value}")
        };
        let url = reqwest::Url::parse(&value).map_err(|_| "代理地址无效")?;
        if url.scheme() != "http"
            || url.host_str().is_none()
            || !url.username().is_empty()
            || url.password().is_some()
            || url.path() != "/"
            || url.query().is_some()
            || url.fragment().is_some()
        {
            return Err("请填写不带账号、路径的 HTTP 代理地址，例如 http://127.0.0.1:7897".into());
        }
        Ok(Self {
            host: url.host_str().unwrap().into(),
            port: url.port_or_known_default().unwrap(),
            url: url.to_string(),
        })
    }
    pub fn client(&self, timeout: Duration) -> Result<reqwest::blocking::Client, String> {
        reqwest::blocking::Client::builder()
            .proxy(reqwest::Proxy::all(&self.url).map_err(|e| e.to_string())?)
            .connect_timeout(Duration::from_secs(6))
            .timeout(timeout)
            .build()
            .map_err(|e| e.to_string())
    }
    fn connect(&self, destination: &str) -> Result<TcpStream, String> {
        let address = (self.host.as_str(), self.port)
            .to_socket_addrs()
            .map_err(|e| e.to_string())?
            .next()
            .ok_or("代理地址解析失败")?;
        let mut stream = TcpStream::connect_timeout(&address, Duration::from_secs(6))
            .map_err(|e| format!("无法连接代理：{e}"))?;
        stream
            .set_read_timeout(Some(Duration::from_secs(8)))
            .map_err(|e| e.to_string())?;
        stream
            .set_write_timeout(Some(Duration::from_secs(8)))
            .map_err(|e| e.to_string())?;
        write!(
            stream,
            "CONNECT {destination} HTTP/1.1\r\nHost: {destination}\r\n\r\n"
        )
        .map_err(|e| e.to_string())?;
        let mut header = Vec::new();
        while !header.ends_with(b"\r\n\r\n") {
            if header.len() >= 8192 {
                return Err("代理响应头过大".into());
            }
            let mut byte = [0];
            stream.read_exact(&mut byte).map_err(|e| e.to_string())?;
            header.push(byte[0]);
        }
        let mut headers = [httparse::EMPTY_HEADER; 64];
        let mut response = httparse::Response::new(&mut headers);
        response.parse(&header).map_err(|e| e.to_string())?;
        if response.code != Some(200) {
            return Err(format!("代理拒绝连接：HTTP {}", response.code.unwrap_or(0)));
        }
        stream.set_read_timeout(None).map_err(|e| e.to_string())?;
        stream.set_write_timeout(None).map_err(|e| e.to_string())?;
        Ok(stream)
    }
}

pub fn client(
    proxy: Option<&HttpProxy>,
    timeout: Duration,
) -> Result<reqwest::blocking::Client, String> {
    match proxy {
        Some(proxy) => proxy.client(timeout),
        None => reqwest::blocking::Client::builder()
            .no_proxy()
            .connect_timeout(Duration::from_secs(6))
            .timeout(timeout)
            .build()
            .map_err(|e| e.to_string()),
    }
}

pub struct EdgeRelay {
    pub addresses: Vec<String>,
    stopped: Arc<AtomicBool>,
    sockets: Arc<Mutex<HashMap<u64, (TcpStream, TcpStream)>>>,
}
impl EdgeRelay {
    pub fn start(proxy: &HttpProxy) -> Result<Self, String> {
        Self::for_destinations(
            proxy,
            &[
                "region1.v2.argotunnel.com:7844",
                "region2.v2.argotunnel.com:7844",
            ],
        )
    }
    fn for_destinations(proxy: &HttpProxy, destinations: &[&str]) -> Result<Self, String> {
        let mut relay = Self {
            addresses: Vec::new(),
            stopped: Arc::new(AtomicBool::new(false)),
            sockets: Arc::new(Mutex::new(HashMap::new())),
        };
        let counter = Arc::new(AtomicU64::new(0));
        let active = Arc::new(AtomicU64::new(0));
        for destination in destinations {
            let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
            listener.set_nonblocking(true).map_err(|e| e.to_string())?;
            relay.addresses.push(
                listener
                    .local_addr()
                    .map_err(|e| e.to_string())?
                    .to_string(),
            );
            let stopped = relay.stopped.clone();
            let sockets = relay.sockets.clone();
            let proxy = proxy.clone();
            let destination = destination.to_string();
            let counter = counter.clone();
            let active = active.clone();
            std::thread::spawn(move || {
                while !stopped.load(Ordering::SeqCst) {
                    match listener.accept() {
                        Ok((mut local, _)) => {
                            if active.load(Ordering::SeqCst) >= 16 {
                                drop(local);
                                std::thread::sleep(Duration::from_millis(100));
                                continue;
                            }
                            active.fetch_add(1, Ordering::SeqCst);
                            let active = active.clone();
                            let proxy = proxy.clone();
                            let destination = destination.clone();
                            let sockets = sockets.clone();
                            let stopped = stopped.clone();
                            let id = counter.fetch_add(1, Ordering::SeqCst);
                            std::thread::spawn(move || {
                                let started = Instant::now();
                                let result = (|| {
                                    let mut remote = proxy.connect(&destination)?;
                                    let mut pairs = sockets.lock().unwrap();
                                    if stopped.load(Ordering::SeqCst) {
                                        return Err("代理中继已关闭".to_string());
                                    }
                                    pairs.insert(
                                        id,
                                        (
                                            local.try_clone().map_err(|e| e.to_string())?,
                                            remote.try_clone().map_err(|e| e.to_string())?,
                                        ),
                                    );
                                    drop(pairs);
                                    let mut upstream =
                                        remote.try_clone().map_err(|e| e.to_string())?;
                                    let mut downstream =
                                        local.try_clone().map_err(|e| e.to_string())?;
                                    let writer = std::thread::spawn(move || {
                                        let _ = std::io::copy(&mut downstream, &mut upstream);
                                        let _ = upstream.shutdown(Shutdown::Write);
                                    });
                                    let _ = std::io::copy(&mut remote, &mut local);
                                    if started.elapsed() < Duration::from_millis(500) {
                                        std::thread::sleep(
                                            Duration::from_millis(500)
                                                .saturating_sub(started.elapsed()),
                                        );
                                    }
                                    let _ = local.shutdown(Shutdown::Both);
                                    let _ = remote.shutdown(Shutdown::Both);
                                    let _ = writer.join();
                                    Ok::<_, String>(())
                                })();
                                if let Err(error) = result {
                                    log::warn!(target: "onlinebg::proxy", "{error}");
                                    if started.elapsed() < Duration::from_millis(500) {
                                        std::thread::sleep(
                                            Duration::from_millis(500)
                                                .saturating_sub(started.elapsed()),
                                        );
                                    }
                                }
                                if let Some((a, b)) = sockets.lock().unwrap().remove(&id) {
                                    let _ = a.shutdown(Shutdown::Both);
                                    let _ = b.shutdown(Shutdown::Both);
                                }
                                active.fetch_sub(1, Ordering::SeqCst);
                            });
                        }
                        Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                            std::thread::sleep(Duration::from_millis(30))
                        }
                        Err(_) => break,
                    }
                }
            });
        }
        Ok(relay)
    }
}
impl Drop for EdgeRelay {
    fn drop(&mut self) {
        self.stopped.store(true, Ordering::SeqCst);
        for (_, (a, b)) in self.sockets.lock().unwrap().drain() {
            let _ = a.shutdown(Shutdown::Both);
            let _ = b.shutdown(Shutdown::Both);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_http_proxy_without_credentials() {
        assert_eq!(HttpProxy::parse("127.0.0.1:7897").unwrap().port, 7897);
        for value in [
            "socks5://localhost:7897",
            "http://user:pass@localhost:7897",
            "http://localhost/a",
        ] {
            assert!(HttpProxy::parse(value).is_err());
        }
    }
    #[test]
    fn connect_relay_preserves_bidirectional_bytes_and_stops() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let proxy =
            HttpProxy::parse(&format!("http://{}", listener.local_addr().unwrap())).unwrap();
        let peer = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut header = Vec::new();
            while !header.ends_with(b"\r\n\r\n") {
                let mut b = [0];
                stream.read_exact(&mut b).unwrap();
                header.push(b[0]);
            }
            assert!(String::from_utf8(header)
                .unwrap()
                .starts_with("CONNECT example.test:7844 HTTP/1.1"));
            stream
                .write_all(b"HTTP/1.1 200 Connection established\r\n\r\n")
                .unwrap();
            let mut bytes = [0; 4];
            stream.read_exact(&mut bytes).unwrap();
            stream.write_all(&bytes).unwrap();
        });
        let relay = EdgeRelay::for_destinations(&proxy, &["example.test:7844"]).unwrap();
        let mut socket = TcpStream::connect(&relay.addresses[0]).unwrap();
        socket
            .set_read_timeout(Some(Duration::from_secs(3)))
            .unwrap();
        socket.write_all(b"test").unwrap();
        let mut bytes = [0; 4];
        socket.read_exact(&mut bytes).unwrap();
        assert_eq!(&bytes, b"test");
        peer.join().unwrap();
        drop(relay);
    }
}
