use crate::network_proxy::HttpProxy;
use http_body_util::{BodyExt, Full, Limited};
use hyper::{
    body::{Bytes, Incoming},
    service::service_fn,
    Request, Response, StatusCode,
};
use hyper_util::rt::TokioIo;
use std::convert::Infallible;
use std::time::Duration;

pub struct QuickApi {
    pub endpoint: String,
    stop: Option<tokio::sync::oneshot::Sender<()>>,
}
impl QuickApi {
    pub fn start(proxy: &HttpProxy) -> Result<Self, String> {
        Self::for_endpoint(proxy, "https://api.trycloudflare.com/tunnel")
    }
    fn for_endpoint(proxy: &HttpProxy, target: &str) -> Result<Self, String> {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
        listener.set_nonblocking(true).map_err(|e| e.to_string())?;
        let endpoint = format!(
            "http://{}",
            listener.local_addr().map_err(|e| e.to_string())?
        );
        let client = reqwest::Client::builder()
            .proxy(reqwest::Proxy::all(&proxy.url).map_err(|e| e.to_string())?)
            .connect_timeout(Duration::from_secs(6))
            .timeout(Duration::from_secs(20))
            .build()
            .map_err(|e| e.to_string())?;
        let target = target.to_string();
        let (stop, mut stopped) = tokio::sync::oneshot::channel();
        tauri::async_runtime::spawn(async move {
            let Ok(listener) = tokio::net::TcpListener::from_std(listener) else {
                return;
            };
            let mut connections = tokio::task::JoinSet::new();
            loop {
                tokio::select! {
                    _ = &mut stopped => break,
                    Some(_) = connections.join_next(), if !connections.is_empty() => {},
                    accepted = listener.accept() => {
                        let Ok((stream, _)) = accepted else { break; };
                        if connections.len() >= 8 { continue; }
                        let client = client.clone(); let target = target.clone();
                        connections.spawn(async move {
                            let service = service_fn(move |request: Request<Incoming>| {
                                let client = client.clone(); let target = target.clone();
                                async move {
                                    let result = async {
                                        if request.method() != hyper::Method::POST || request.uri().path() != "/tunnel" { return Err("不支持的入口申请".to_string()); }
                                        let agent = request.headers().get(hyper::header::USER_AGENT).cloned().unwrap_or_else(|| hyper::header::HeaderValue::from_static("cloudflared"));
                                        let body = Limited::new(request.into_body(), 16384).collect().await.map_err(|e| e.to_string())?.to_bytes();
                                        let response = client.post(target).header("Content-Type", "application/json").header("User-Agent", agent).body(body).send().await.map_err(|e| format!("{e:?}"))?;
                                        let status = response.status();
                                        let body = response.bytes().await.map_err(|e| e.to_string())?;
                                        Response::builder().status(status).header("Content-Type", "application/json").body(Full::new(body)).map_err(|e| e.to_string())
                                    }.await;
                                    let response = match result {
                                        Ok(response) => response,
                                        Err(error) => {
                                            log::warn!(target:"onlinebg::proxy", "入口申请代理失败：{error}");
                                            let mut response = Response::new(Full::new(Bytes::from("入口申请代理失败，请查看软件日志")));
                                            *response.status_mut() = StatusCode::BAD_GATEWAY;
                                            response
                                        }
                                    };
                                    Ok::<_, Infallible>(response)
                                }
                            });
                            let _ = hyper::server::conn::http1::Builder::new().serve_connection(TokioIo::new(stream), service).await;
                        });
                    }
                }
            }
            connections.abort_all();
            while connections.join_next().await.is_some() {}
        });
        Ok(Self {
            endpoint,
            stop: Some(stop),
        })
    }
}
impl Drop for QuickApi {
    fn drop(&mut self) {
        if let Some(stop) = self.stop.take() {
            let _ = stop.send(());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    #[test]
    fn https_api_uses_connect_and_surfaces_proxy_rejection() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let proxy =
            HttpProxy::parse(&format!("http://{}", listener.local_addr().unwrap())).unwrap();
        let peer = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            stream
                .set_read_timeout(Some(Duration::from_secs(3)))
                .unwrap();
            let mut header = Vec::new();
            while !header.ends_with(b"\r\n\r\n") {
                let mut byte = [0];
                stream.read_exact(&mut byte).unwrap();
                header.push(byte[0]);
            }
            assert!(String::from_utf8(header)
                .unwrap()
                .starts_with("CONNECT example.test:443 HTTP/1.1"));
            stream
                .write_all(
                    b"HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
                )
                .unwrap();
        });
        let api = QuickApi::for_endpoint(&proxy, "https://example.test/tunnel").unwrap();
        let response = reqwest::blocking::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(3))
            .build()
            .unwrap()
            .post(format!("{}/tunnel", api.endpoint))
            .body("{}")
            .send()
            .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
        peer.join().unwrap();
    }
    #[test]
    fn forwards_quick_tunnel_api_through_real_http_proxy() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let proxy =
            HttpProxy::parse(&format!("http://{}", listener.local_addr().unwrap())).unwrap();
        let peer = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            stream
                .set_read_timeout(Some(Duration::from_secs(3)))
                .unwrap();
            let mut header = Vec::new();
            while !header.ends_with(b"\r\n\r\n") {
                let mut byte = [0];
                stream.read_exact(&mut byte).unwrap();
                header.push(byte[0]);
            }
            assert!(String::from_utf8(header)
                .unwrap()
                .starts_with("POST http://example.test/tunnel HTTP/1.1"));
            stream.write_all(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 11\r\nConnection: close\r\n\r\n{\"ok\":true}").unwrap();
        });
        let api = QuickApi::for_endpoint(&proxy, "http://example.test/tunnel").unwrap();
        let response = reqwest::blocking::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(3))
            .build()
            .unwrap()
            .post(format!("{}/tunnel", api.endpoint))
            .body("{}")
            .send()
            .unwrap();
        assert_eq!(response.text().unwrap(), "{\"ok\":true}");
        peer.join().unwrap();
        drop(api);
    }
}
