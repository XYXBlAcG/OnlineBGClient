pub struct StartupRetry;
impl StartupRetry {
    pub const ATTEMPTS: usize = 3;
    pub fn run<T>(
        mut active: impl FnMut() -> Result<(), String>,
        mut prepare: impl FnMut(usize) -> Result<T, String>,
    ) -> Result<T, String> {
        let mut attempt = 0;
        loop {
            attempt += 1;
            active()?;
            match prepare(attempt) {
                Ok(value) => return Ok(value),
                Err(error) => {
                    active()?;
                    if attempt == Self::ATTEMPTS {
                        return Err(format!("公网入口创建失败，已尝试 {} 次。请重新点击“一键创建公网房间”。原因：{error}", Self::ATTEMPTS));
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

    #[test]
    fn returns_success_on_first_or_later_attempt() {
        let calls = Cell::new(0);
        let result = StartupRetry::run(
            || Ok(()),
            |attempt| {
                calls.set(calls.get() + 1);
                if attempt < 3 {
                    Err("连接失败".into())
                } else {
                    Ok("ready")
                }
            },
        );
        assert_eq!(result.unwrap(), "ready");
        assert_eq!(calls.get(), 3);
        let result = StartupRetry::run(|| Ok(()), |attempt| Ok(attempt));
        assert_eq!(result.unwrap(), 1);
    }

    #[test]
    fn fails_after_exactly_three_attempts() {
        let calls = Cell::new(0);
        let result: Result<(), String> = StartupRetry::run(
            || Ok(()),
            |_| {
                calls.set(calls.get() + 1);
                Err("网络断开".into())
            },
        );
        let error = result.unwrap_err();
        assert_eq!(calls.get(), 3);
        assert!(error.contains("3 次"));
        assert!(error.contains("重新"));
        assert!(error.contains("网络断开"));
    }

    #[test]
    fn cancellation_stops_before_another_attempt_and_drops_failed_resources() {
        struct Resource<'a>(&'a Cell<usize>);
        impl Drop for Resource<'_> {
            fn drop(&mut self) {
                self.0.set(self.0.get() + 1);
            }
        }
        let dropped = Cell::new(0);
        let cancelled = Cell::new(false);
        let result: Result<(), String> = StartupRetry::run(
            || {
                if cancelled.get() {
                    Err("房间创建已取消".into())
                } else {
                    Ok(())
                }
            },
            |_| {
                let _resource = Resource(&dropped);
                cancelled.set(true);
                Err("网络断开".into())
            },
        );
        assert_eq!(result.unwrap_err(), "房间创建已取消");
        assert_eq!(dropped.get(), 1);
    }

    #[test]
    fn releases_each_failed_attempt_before_starting_the_next() {
        struct Resource<'a>(&'a Cell<bool>);
        impl Drop for Resource<'_> {
            fn drop(&mut self) {
                self.0.set(false);
            }
        }
        let running = Cell::new(false);
        let calls = Cell::new(0);
        let result: Result<(), String> = StartupRetry::run(
            || Ok(()),
            |_| {
                assert!(!running.get());
                running.set(true);
                let _resource = Resource(&running);
                calls.set(calls.get() + 1);
                Err("失败".into())
            },
        );
        assert!(result.is_err());
        assert_eq!(calls.get(), 3);
        assert!(!running.get());
        let result: Result<(), String> = StartupRetry::run(
            || Err("房间创建已取消".into()),
            |_| {
                panic!("cancelled startup must not run");
            },
        );
        assert_eq!(result.unwrap_err(), "房间创建已取消");
    }
}
