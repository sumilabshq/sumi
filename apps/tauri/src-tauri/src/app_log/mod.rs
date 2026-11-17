pub mod levels;
pub mod redaction;
pub mod rotating_file;
pub mod utc;

use crate::store::place::home_app_folder;
use levels::{chosen_level, level_word, LEVEL_VARIABLE};
use log::{Level, Metadata, Record};
use rotating_file::RotatingFile;
use serde::Serialize;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::io::Write;
use std::sync::{Mutex, MutexGuard, OnceLock, PoisonError};

pub const LOG_FOLDER: &str = "logs";
pub const EVERY_LINE_FILE: &str = "sumi.log";
pub const ERRORS_FILE: &str = "errors.log";
pub const DEBUG_FILE: &str = "debug.log";

const MOST_BYTES_PER_FILE: u64 = 5 * 1024 * 1024;
const KEPT_OLD_EVERY_LINE_FILES: usize = 3;
const KEPT_OLD_ERROR_FILES: usize = 5;
const KEPT_OLD_DEBUG_FILES: usize = 2;
const OWN_CRATES: [&str; 2] = ["widgetarium_host_tauri_lib", "widgetarium_host_tauri"];
const HOST_SOURCE: &str = "host";
const MAIN_PROCESS: &str = "app";

#[derive(Serialize, Default, Clone)]
pub struct LogContext {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tab: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chat: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct LogEntry {
    #[serde(serialize_with = "serialize_level_word")]
    pub level: Level,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub module: Option<String>,
    #[serde(flatten)]
    pub context: LogContext,
    pub line: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

impl LogEntry {
    fn console_line(&self) -> String {
        let data = self.data.as_ref().map(|data| format!(" {data}")).unwrap_or_default();
        format!("{} [{}] {}{data}", level_word(self.level), self.source, self.line)
    }
}

fn serialize_level_word<S: serde::Serializer>(level: &Level, serializer: S) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(&level_word(*level))
}

#[derive(Serialize)]
struct WrittenEntry<'a> {
    at: String,
    process: &'a str,
    #[serde(flatten)]
    entry: &'a LogEntry,
}

pub struct AppLog {
    every_line: RotatingFile,
    errors: RotatingFile,
    debug: Option<RotatingFile>,
    kept_level: Level,
    process: String,
    writing: Mutex<()>,
}

impl AppLog {
    pub fn in_folder(folder: &Path, process: &str, kept_level: Level) -> Self {
        let file = |name: &str, kept_old_files: usize| RotatingFile {
            path: folder.join(name),
            most_bytes: MOST_BYTES_PER_FILE,
            kept_old_files,
        };
        if let Err(failure) = std::fs::create_dir_all(folder) {
            say(&format!("[app-log] {} none → missing ({failure})", folder.display()));
        }

        Self {
            every_line: file(EVERY_LINE_FILE, KEPT_OLD_EVERY_LINE_FILES),
            errors: file(ERRORS_FILE, KEPT_OLD_ERROR_FILES),
            debug: (kept_level > Level::Info).then(|| file(DEBUG_FILE, KEPT_OLD_DEBUG_FILES)),
            kept_level,
            process: process.to_owned(),
            writing: Mutex::new(()),
        }
    }

    pub fn keeps(&self, level: Level) -> bool {
        level <= self.kept_level
    }

    pub fn write(&self, entry: &LogEntry) {
        if !self.keeps(entry.level) {
            return;
        }

        self.write_kept(&kept_entry(entry), self.writing.lock().unwrap_or_else(PoisonError::into_inner));
    }

    fn write_kept(&self, kept: &LogEntry, _writing: MutexGuard<'_, ()>) {
        let written = WrittenEntry {
            at: utc::utc_now(),
            process: &self.process,
            entry: kept,
        };
        let Ok(json) = serde_json::to_string(&written) else {
            say(&format!("[app-log] line → lost (it is not JSON): {}", kept.line));
            return;
        };
        let line = format!("{json}\n");

        if kept.level <= Level::Info {
            append_or_say(&self.every_line, &line);
        }

        if kept.level <= Level::Warn {
            append_or_say(&self.errors, &line);
        }

        if let Some(debug) = &self.debug {
            append_or_say(debug, &line);
        }
    }
}

fn kept_entry(entry: &LogEntry) -> LogEntry {
    LogEntry {
        data: entry.data.as_ref().map(redaction::kept_data),
        ..entry.clone()
    }
}

static APP_LOG: OnceLock<AppLog> = OnceLock::new();
static HOST_LOGGER: HostLogger = HostLogger;

pub fn start(process: &str) {
    let (level, unknown_word) = chosen_level();

    if log::set_logger(&HOST_LOGGER).is_ok() {
        log::set_max_level(level.to_level_filter());
    }

    let Some(folder) = log_folder() else {
        log::warn!("[app-log] off → stderr only (HOME is not set)");
        return;
    };

    if APP_LOG.set(AppLog::in_folder(&folder, process, level)).is_err() {
        return;
    }

    log_panics();

    if let Some(word) = unknown_word {
        log::warn!("[app-log] {LEVEL_VARIABLE}={word} is no level → {}", level_word(level));
    }

    let started_level = if process == MAIN_PROCESS { Level::Info } else { Level::Debug };
    log::log!(
        started_level,
        "[app-log] {process} none → running (pid {}, version {}, level {}, {})",
        std::process::id(),
        env!("CARGO_PKG_VERSION"),
        level_word(level),
        folder.display()
    );
}

pub fn kept_level() -> Level {
    APP_LOG.get().map_or(Level::Info, |app_log| app_log.kept_level)
}

pub fn log_folder() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join(home_app_folder()).join(LOG_FOLDER))
}

pub fn write(entry: &LogEntry) {
    if entry.level > kept_level() {
        return;
    }

    let kept = kept_entry(entry);
    say(&kept.console_line());

    if let Some(app_log) = APP_LOG.get() {
        app_log.write_kept(&kept, app_log.writing.lock().unwrap_or_else(PoisonError::into_inner));
    }
}

fn say(text: &str) {
    let _ = writeln!(std::io::stderr(), "{text}");
}

fn append_or_say(file: &RotatingFile, line: &str) {
    if let Err(failure) = file.append(line) {
        say(&format!("[app-log] {} line → lost or not rotated ({failure})", file.path.display()));
    }
}

struct HostLogger;

impl log::Log for HostLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= lowest_level_of(metadata.target())
    }

    fn log(&self, record: &Record) {
        if !self.enabled(record.metadata()) {
            return;
        }

        write(&LogEntry {
            level: record.level(),
            source: HOST_SOURCE.to_owned(),
            module: Some(record.target().to_owned()),
            context: LogContext::default(),
            line: record.args().to_string(),
            data: None,
        });
    }

    fn flush(&self) {}
}

fn lowest_level_of(target: &str) -> Level {
    if OWN_CRATES.iter().any(|own| target.starts_with(own)) {
        return kept_level();
    }

    Level::Warn
}

fn log_panics() {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let Some(app_log) = APP_LOG.get() else {
            default_hook(info);
            return;
        };
        let Ok(writing) = app_log.writing.try_lock() else {
            default_hook(info);
            return;
        };
        let panicked = LogEntry {
            level: Level::Error,
            source: HOST_SOURCE.to_owned(),
            module: None,
            context: LogContext::default(),
            line: format!("panic {info}"),
            data: Some(json!({ "backtrace": std::backtrace::Backtrace::force_capture().to_string() })),
        };
        app_log.write_kept(&kept_entry(&panicked), writing);
        default_hook(info);
    }));
}
