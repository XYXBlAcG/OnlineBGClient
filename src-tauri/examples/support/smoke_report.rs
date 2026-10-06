use std::{
    fs::{self, OpenOptions},
    io::{self, Write},
    path::PathBuf,
    sync::Mutex,
};
struct State {
    phase: String,
    finished: bool,
}
pub struct SmokeReport {
    output: PathBuf,
    state: Mutex<State>,
}
impl SmokeReport {
    pub fn new(output: PathBuf) -> io::Result<Self> {
        fs::write(&output, "")?;
        fs::write(output.with_extension("progress.log"), "")?;
        Ok(Self {
            output,
            state: Mutex::new(State {
                phase: "starting".into(),
                finished: false,
            }),
        })
    }
    pub fn progress(&self, phase: &str) -> io::Result<()> {
        let mut state = self.state.lock().unwrap();
        if state.finished {
            return Ok(());
        }
        writeln!(
            OpenOptions::new()
                .append(true)
                .open(self.output.with_extension("progress.log"))?,
            "{phase}"
        )?;
        state.phase = phase.into();
        eprintln!("SMOKE: {phase}");
        Ok(())
    }
    pub fn phase(&self) -> String {
        self.state.lock().unwrap().phase.clone()
    }
    pub fn finish(&self, result: &str) -> io::Result<Option<i32>> {
        let mut state = self.state.lock().unwrap();
        if state.finished {
            return Ok(None);
        }
        fs::write(&self.output, result)?;
        state.finished = true;
        Ok(Some(if result.starts_with("PASS") { 0 } else { 1 }))
    }
    pub fn timeout(&self) -> io::Result<Option<i32>> {
        self.finish(&format!(
            "FAIL: native smoke deadline reached; last phase: {}",
            self.phase()
        ))
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn output() -> std::path::PathBuf {
        static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        std::env::temp_dir().join(format!(
            "onlinebg-smoke-{}-{}-{}.txt",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
        ))
    }
    #[test]
    fn records_real_progress_and_keeps_the_first_terminal_result() {
        let path = output();
        let report = SmokeReport::new(path.clone()).unwrap();
        report.progress("opening-settings").unwrap();
        report.progress("hard-ai-decisions:30/30").unwrap();
        assert_eq!(report.phase(), "hard-ai-decisions:30/30");
        let log = std::fs::read_to_string(path.with_extension("progress.log")).unwrap();
        assert!(log.contains("opening-settings"));
        assert!(log.contains("hard-ai-decisions:30/30"));
        assert_eq!(report.finish("PASS: real workers").unwrap(), Some(0));
        assert_eq!(report.finish("FAIL: late timeout").unwrap(), None);
        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            "PASS: real workers"
        );
        std::fs::remove_file(path.with_extension("progress.log")).unwrap();
        std::fs::remove_file(path).unwrap();
    }
    #[test]
    fn produces_an_actionable_failure_when_the_webview_never_reports() {
        let path = output();
        let report = SmokeReport::new(path.clone()).unwrap();
        report.progress("opening-settings").unwrap();
        assert_eq!(report.timeout().unwrap(), Some(1));
        assert!(std::fs::read_to_string(&path)
            .unwrap()
            .contains("opening-settings"));
        std::fs::remove_file(path.with_extension("progress.log")).unwrap();
        std::fs::remove_file(path).unwrap();
    }
}
