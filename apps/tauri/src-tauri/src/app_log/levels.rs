use log::Level;

pub const LEVEL_VARIABLE: &str = "SUMI_LOG";

const DEFAULT_LEVEL: Level = Level::Info;

pub fn level_word(level: Level) -> String {
    level.as_str().to_lowercase()
}

pub fn level_of_word(word: &str) -> Option<Level> {
    match word.trim().to_lowercase().as_str() {
        "error" => Some(Level::Error),
        "warn" => Some(Level::Warn),
        "info" => Some(Level::Info),
        "debug" => Some(Level::Debug),
        "trace" => Some(Level::Trace),
        _ => None,
    }
}

pub fn level_asked(asked: Option<&str>) -> (Level, Option<String>) {
    let Some(word) = asked.filter(|word| !word.trim().is_empty()) else {
        return (DEFAULT_LEVEL, None);
    };

    match level_of_word(word) {
        Some(level) => (level, None),
        None => (DEFAULT_LEVEL, Some(word.to_owned())),
    }
}

pub fn chosen_level() -> (Level, Option<String>) {
    level_asked(std::env::var(LEVEL_VARIABLE).ok().as_deref())
}
