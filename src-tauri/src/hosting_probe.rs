use std::time::{Duration, Instant};
pub fn wait_ready(
    endpoint: &str,
    routes: &[(&str, reqwest::blocking::Client)],
    timeout: Duration,
    mut active: impl FnMut() -> Result<(), String>,
) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    let mut last_error = String::from("没有可用的探测路径");
    loop {
        active()?;
        for (route, client) in routes {
            let result = (|| {
                let response = client
                    .get(format!("{endpoint}/health"))
                    .send()
                    .map_err(|e| format!("{e:?}"))?;
                let status = response.status();
                if !status.is_success() {
                    return Err(format!("HTTP {status}"));
                }
                let value = response
                    .json::<serde_json::Value>()
                    .map_err(|e| format!("健康响应无效：{e:?}"))?;
                if value["ready"] != true {
                    return Err("房间服务尚未就绪".into());
                }
                Ok::<_, String>(())
            })();
            match result {
                Ok(()) => {
                    log::info!(target:"onlinebg::hosting", "health route={route} ready=true");
                    return Ok(());
                }
                Err(error) => {
                    last_error = format!("{route}: {error}");
                    log::warn!(target:"onlinebg::hosting", "health {last_error}");
                }
            }
            active()?;
            if Instant::now() >= deadline {
                return Err(format!("隧道已注册，但公网健康检查失败：{last_error}"));
            }
        }
        if Instant::now() >= deadline {
            return Err(format!("隧道已注册，但公网健康检查失败：{last_error}"));
        }
        std::thread::sleep(Duration::from_millis(500));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        io::{Read, Write},
        net::TcpListener,
        time::Duration,
    };
    #[test]
    fn waits_for_origin_and_reports_non_ready_responses() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let endpoint = format!("http://{}", listener.local_addr().unwrap());
        let peer = std::thread::spawn(move || {
            for body in ["{\"ready\":false}", "{\"ready\":true}"] {
                let (mut stream, _) = listener.accept().unwrap();
                let mut buffer = [0; 2048];
                let _ = stream.read(&mut buffer).unwrap();
                write!(stream,"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",body.len(),body).unwrap();
            }
        });
        let client = reqwest::blocking::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(1))
            .build()
            .unwrap();
        assert!(wait_ready(
            &endpoint,
            &[("direct", client)],
            Duration::from_secs(3),
            || Ok(())
        )
        .is_ok());
        peer.join().unwrap();
    }
    #[test]
    fn reports_http_status_without_replacing_it_with_a_generic_timeout() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let endpoint = format!("http://{}", listener.local_addr().unwrap());
        let peer = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut bytes = [0; 2048];
            let _ = stream.read(&mut bytes).unwrap();
            stream.write_all(b"HTTP/1.1 503 Service Unavailable\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").unwrap();
        });
        let client = reqwest::blocking::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(1))
            .build()
            .unwrap();
        let error =
            wait_ready(&endpoint, &[("direct", client)], Duration::ZERO, || Ok(())).unwrap_err();
        assert!(error.contains("direct: HTTP 503"), "{error}");
        peer.join().unwrap();
    }
    #[test]
    fn cancellation_is_immediate() {
        assert_eq!(
            wait_ready("http://127.0.0.1:1", &[], Duration::from_secs(1), || Err(
                "cancelled".into()
            ))
            .unwrap_err(),
            "cancelled"
        );
    }
}
