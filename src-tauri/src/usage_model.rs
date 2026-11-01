use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageData {
    pub format: u8,
    pub enabled: bool,
    pub since: u64,
    pub total_ms: u64,
    pub games: BTreeMap<String, u64>,
}
impl UsageData {
    pub fn new(since: u64) -> Self {
        Self {
            format: 1,
            enabled: true,
            since,
            total_ms: 0,
            games: BTreeMap::new(),
        }
    }
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayContext {
    pub game: String,
    pub session: String,
}
#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PlaySession {
    pub game: String,
    pub elapsed_ms: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSnapshot {
    pub data: UsageData,
    pub current_ms: u64,
    pub sessions: BTreeMap<String, PlaySession>,
    pub error: Option<String>,
}
pub struct UsageClock {
    pub data: UsageData,
    pub current_ms: u64,
    pub sessions: BTreeMap<String, PlaySession>,
    pub contexts: BTreeMap<String, PlayContext>,
    previous: Option<u64>,
    was_active: bool,
    pub error: Option<String>,
}
impl UsageClock {
    pub fn new(data: UsageData) -> Self {
        Self {
            data,
            current_ms: 0,
            sessions: BTreeMap::new(),
            contexts: BTreeMap::new(),
            previous: None,
            was_active: false,
            error: None,
        }
    }
    pub fn sample(&mut self, now: u64, visible: &[String], focused: Option<&str>, locked: bool) {
        let delta = self.previous.map_or(0, |before| now.saturating_sub(before));
        self.previous = Some(now);
        let active = self.data.enabled && self.error.is_none() && !locked && !visible.is_empty();
        let count = active && self.was_active && delta <= 2000;
        self.was_active = active;
        if !count {
            return;
        }
        self.current_ms += delta;
        self.data.total_ms += delta;
        let owner = focused
            .filter(|label| {
                visible.iter().any(|v| v == label) && self.contexts.contains_key(*label)
            })
            .or_else(|| {
                visible
                    .iter()
                    .find(|label| self.contexts.contains_key(*label))
                    .map(String::as_str)
            });
        if let Some(context) = owner.and_then(|label| self.contexts.get(label)) {
            *self.data.games.entry(context.game.clone()).or_default() += delta;
            let session = self
                .sessions
                .entry(context.session.clone())
                .or_insert_with(|| PlaySession {
                    game: context.game.clone(),
                    elapsed_ms: 0,
                });
            session.elapsed_ms += delta;
        }
    }
    pub fn snapshot(&self) -> UsageSnapshot {
        UsageSnapshot {
            data: self.data.clone(),
            current_ms: self.current_ms,
            sessions: self.sessions.clone(),
            error: self.error.clone(),
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn auxiliary_windows_do_not_multiply_time_and_hidden_game_does_not_run() {
        let mut clock = UsageClock::new(UsageData::new(1));
        clock.contexts.insert(
            "main".into(),
            PlayContext {
                game: "expedition".into(),
                session: "room:1".into(),
            },
        );
        let windows = vec!["main".into(), "aux-settings".into()];
        clock.sample(0, &windows, None, false);
        clock.sample(1000, &windows, None, false);
        assert_eq!(clock.data.total_ms, 1000);
        assert_eq!(clock.data.games["expedition"], 1000);
        clock.sample(2000, &["aux-settings".into()], None, false);
        assert_eq!(clock.data.total_ms, 2000);
        assert_eq!(clock.data.games["expedition"], 1000);
    }
    #[test]
    fn sleep_lock_disconnect_and_new_launch_keep_correct_boundaries() {
        let mut clock = UsageClock::new(UsageData::new(1));
        let windows = vec!["main".into()];
        let context = PlayContext {
            game: "uno".into(),
            session: "same-round".into(),
        };
        clock.contexts.insert("main".into(), context.clone());
        clock.sample(0, &windows, None, false);
        clock.sample(1000, &windows, None, false);
        clock.sample(2000, &windows, None, true);
        clock.sample(900000, &windows, None, false);
        clock.sample(901000, &windows, None, false);
        assert_eq!(clock.data.total_ms, 2000);
        clock.contexts.clear();
        clock.sample(902000, &windows, None, false);
        clock.contexts.insert("main".into(), context);
        clock.sample(903000, &windows, None, false);
        assert_eq!(clock.sessions["same-round"].elapsed_ms, 3000);
        let data = serde_json::from_str(&serde_json::to_string(&clock.data).unwrap()).unwrap();
        let relaunched = UsageClock::new(data);
        assert_eq!(relaunched.current_ms, 0);
        assert_eq!(relaunched.data.total_ms, 4000);
    }
    #[test]
    fn disabled_hidden_and_faulted_clocks_never_accumulate() {
        let mut clock = UsageClock::new(UsageData::new(1));
        clock.sample(0, &[], None, false);
        clock.sample(1000, &[], None, false);
        clock.data.enabled = false;
        clock.sample(2000, &["main".into()], None, false);
        clock.data.enabled = true;
        clock.error = Some("damaged".into());
        clock.sample(3000, &["main".into()], None, false);
        assert_eq!(clock.data.total_ms, 0);
    }
}
