use super::app_log::levels::{level_of_word, level_word};
use super::app_log::{self, kept_level, LogContext, LogEntry};
use super::studio_caller::{refuse_foreign_caller, CORE_WINDOW};
use log::Level;
use serde_json::{json, Value};
use tauri::ipc::{Invoke, InvokeBody, InvokeError};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::Wry;

pub const PLUGIN_NAME: &str = "studio-log";

const LONGEST_LINE_CHARS: usize = 4000;
const NOT_A_LINE: &str = "A studio log line is a level (error, warn, info, debug or trace) and a text.";
const UNKNOWN_COMMAND: &str = "The studio log answers only line and level.";
const LINE_COMMAND: &str = "line";
const LEVEL_COMMAND: &str = "level";
const STUDIO_SOURCE: &str = "studio";
const CORE_SOURCE: &str = "core";

pub fn studio_entry(window: &str, args: &Value) -> Result<LogEntry, String> {
    let level = text_in(args, "level").and_then(level_of_word).ok_or(NOT_A_LINE)?;
    let line = text_in(args, "line").ok_or(NOT_A_LINE)?;
    let owned_text = |name: &str| text_in(args, name).map(str::to_owned);

    Ok(LogEntry {
        level,
        source: if window == CORE_WINDOW { CORE_SOURCE } else { STUDIO_SOURCE }.to_owned(),
        module: None,
        context: LogContext {
            window: Some(window.to_owned()),
            workspace: owned_text("workspace"),
            tab: owned_text("tab"),
            chat: owned_text("chat"),
        },
        line: line.chars().take(LONGEST_LINE_CHARS).collect(),
        data: args.get("data").filter(|data| !data.is_null()).cloned(),
    })
}

pub fn level_answer(kept: Level) -> Value {
    json!({ "level": level_word(kept), "keepsDebug": kept >= Level::Debug })
}

fn text_in<'a>(args: &'a Value, name: &str) -> Option<&'a str> {
    args.get(name).and_then(Value::as_str)
}

fn answered(invoke: &Invoke<Wry>) -> Result<Value, String> {
    let window = invoke.message.webview().label().to_owned();
    refuse_foreign_caller(&window)?;

    match invoke.message.command() {
        LINE_COMMAND => written(invoke, &window),
        LEVEL_COMMAND => Ok(level_answer(kept_level())),
        _ => Err(UNKNOWN_COMMAND.into()),
    }
}

fn written(invoke: &Invoke<Wry>, window: &str) -> Result<Value, String> {
    let InvokeBody::Json(args) = invoke.message.payload() else { return Err(NOT_A_LINE.into()) };

    app_log::write(&studio_entry(window, args)?);
    Ok(Value::Null)
}

pub fn init() -> TauriPlugin<Wry> {
    Builder::new(PLUGIN_NAME)
        .invoke_handler(|invoke| {
            let answer = answered(&invoke);
            invoke.resolver.respond(answer.map_err(InvokeError::from));
            true
        })
        .build()
}
