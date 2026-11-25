use super::studio_caller::refuse_foreign_caller;
use serde_json::Value;
use tauri::ipc::{Invoke, InvokeBody, InvokeError};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Wry};

pub const PLUGIN_NAME: &str = "haptics";
const TAP: &str = "tap";
const UNKNOWN_COMMAND: &str = "The haptics plugin has no command {name}";
const UNKNOWN_PATTERN: &str = "The haptics tap call names no known pattern: {pattern}";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HapticPattern {
    Alignment,
    LevelChange,
    Generic,
}

pub fn pattern_of(payload: &Value) -> Result<HapticPattern, String> {
    match payload.get("pattern").and_then(Value::as_str) {
        Some("alignment") => Ok(HapticPattern::Alignment),
        Some("levelChange") => Ok(HapticPattern::LevelChange),
        Some("generic") => Ok(HapticPattern::Generic),
        other => Err(UNKNOWN_PATTERN.replace("{pattern}", &format!("{other:?}"))),
    }
}

#[cfg(target_os = "macos")]
fn perform(pattern: HapticPattern) {
    use objc2_app_kit::{NSHapticFeedbackManager, NSHapticFeedbackPattern, NSHapticFeedbackPerformanceTime, NSHapticFeedbackPerformer};

    let native = match pattern {
        HapticPattern::Alignment => NSHapticFeedbackPattern::Alignment,
        HapticPattern::LevelChange => NSHapticFeedbackPattern::LevelChange,
        HapticPattern::Generic => NSHapticFeedbackPattern::Generic,
    };
    NSHapticFeedbackManager::defaultPerformer()
        .performFeedbackPattern_performanceTime(native, NSHapticFeedbackPerformanceTime::Now);
}

// TODO: Windows haptics API
#[cfg(not(target_os = "macos"))]
fn perform(_pattern: HapticPattern) {}

fn tapped(invoke: &Invoke<Wry>) -> Result<Value, String> {
    let message = &invoke.message;
    refuse_foreign_caller(message.webview().label())?;

    if message.command() != TAP {
        return Err(UNKNOWN_COMMAND.replace("{name}", message.command()));
    }

    let InvokeBody::Json(payload) = message.payload() else { return Err(UNKNOWN_PATTERN.replace("{pattern}", "none")) };
    let pattern = pattern_of(payload)?;
    message
        .webview()
        .app_handle()
        .run_on_main_thread(move || perform(pattern))
        .map_err(|error| error.to_string())?;
    Ok(Value::Null)
}

pub fn init() -> TauriPlugin<Wry> {
    Builder::new(PLUGIN_NAME)
        .invoke_handler(|invoke| {
            let answer = tapped(&invoke);
            invoke.resolver.respond(answer.map_err(InvokeError::from));
            true
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn reads_every_pattern_the_contract_names() {
        assert_eq!(pattern_of(&json!({ "pattern": "alignment" })), Ok(HapticPattern::Alignment));
        assert_eq!(pattern_of(&json!({ "pattern": "levelChange" })), Ok(HapticPattern::LevelChange));
        assert_eq!(pattern_of(&json!({ "pattern": "generic" })), Ok(HapticPattern::Generic));
    }

    #[test]
    fn refuses_an_unknown_pattern() {
        assert!(pattern_of(&json!({ "pattern": "thud" })).is_err());
        assert!(pattern_of(&json!({})).is_err());
    }
}
