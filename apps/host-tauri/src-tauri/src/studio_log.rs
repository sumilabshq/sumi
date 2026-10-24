use super::studio_caller::refuse_foreign_caller;
use serde_json::Value;
use tauri::ipc::{Invoke, InvokeBody, InvokeError};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::Wry;

pub const PLUGIN_NAME: &str = "studio-log";

const STUDIO_MARK: &str = "[widgetarium]";
const LEVELS: [&str; 3] = ["info", "warn", "error"];
const LONGEST_LINE_CHARS: usize = 4000;
const NOT_A_LINE: &str = "A studio log line is a level and a text.";

pub fn studio_line(level: &str, line: &str) -> Option<String> {
    if !LEVELS.contains(&level) || !line.starts_with(STUDIO_MARK) {
        return None;
    }

    let kept: String = line.chars().take(LONGEST_LINE_CHARS).collect();
    Some(format!("[studio] {level} {kept}"))
}

fn text_in<'a>(args: &'a Value, name: &str) -> Result<&'a str, String> {
    args.get(name).and_then(Value::as_str).ok_or_else(|| NOT_A_LINE.to_string())
}

fn written(invoke: &Invoke<Wry>) -> Result<Value, String> {
    refuse_foreign_caller(invoke.message.webview().label())?;

    let InvokeBody::Json(args) = invoke.message.payload() else { return Err(NOT_A_LINE.into()) };

    if let Some(line) = studio_line(text_in(args, "level")?, text_in(args, "line")?) {
        eprintln!("{line}");
    }

    Ok(Value::Null)
}

pub fn init() -> TauriPlugin<Wry> {
    Builder::new(PLUGIN_NAME)
        .invoke_handler(|invoke| {
            let answer = written(&invoke);
            invoke.resolver.respond(answer.map_err(InvokeError::from));
            true
        })
        .build()
}
