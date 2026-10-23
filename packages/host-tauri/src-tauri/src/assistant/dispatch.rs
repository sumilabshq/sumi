use super::commands::{self, ClaudeAsk, StartAsk};
use super::drops;
use super::state::Assistant;
use super::turns::TurnSink;
use serde_json::Value;
use crate::store::{opened_working_folder, Store};
use crate::studio_caller::refuse_foreign_caller;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Arc;
use tauri::Manager;
use tauri::ipc::{Channel, Invoke, InvokeBody, InvokeError, InvokeMessage, InvokeResolver, JavaScriptChannelId, Response};
use tauri::Runtime;
use tauri_plugin_dialog::DialogExt;

pub const ATTACHMENT_PATH_HEADER: &str = "x-widgetarium-attachment";

const MISSING_ARGUMENT: &str = "The call is missing its {name} argument.";
const NOT_A_CHANNEL: &str = "The call's onEvent argument is not a channel.";
const NOT_BYTES: &str = "An attachment must be sent as raw bytes.";
const TOO_BIG: &str = "An attachment may hold at most 50 MB.";
const MOST_ATTACHMENT_BYTES: usize = 50 * 1024 * 1024;

type Answer = Result<Value, String>;

// TRADE-OFF: commands are dispatched by hand instead of with tauri's command attribute, because the comment gate reads every line that starts with # as a comment
pub fn handle<R: Runtime>(assistant: &Arc<Assistant>, invoke: Invoke<R>) -> bool {
    let Invoke { message, resolver, .. } = invoke;
    if let Err(refused) = refuse_foreign_caller(message.webview().label()) {
        resolver.reject(refused);
        return true;
    }

    let assistant = assistant.clone();
    match message.command() {
        "providers" => {
            let project = working_folder_of(&message);
            off_main_thread(resolver, move || Ok(commands::providers(&assistant, project.as_deref())))
        }
        "start_turn" => match turn_start_of(&message) {
            Ok(start) => {
                let project = working_folder_of(&message);
                off_main_thread(resolver, move || start_turn(&assistant, project.as_deref(), start))
            }
            Err(refusal) => resolver.respond(as_reply(Err(refusal))),
        },
        "pick_folder" => {
            let app = message.webview().app_handle().clone();
            off_main_thread(resolver, move || pick_folder(&assistant, &app))
        }
        "drop_paths" => match texts_argument(&message, "paths") {
            Ok(paths) => off_main_thread(resolver, move || Ok(drops::drop_paths(&assistant, &paths))),
            Err(refusal) => resolver.respond(as_reply(Err(refusal))),
        },
        "read_dropped" => match text_argument(&message, "path") {
            Ok(path) => read_dropped(resolver, assistant, path.to_string()),
            Err(refusal) => resolver.respond(as_reply(Err(refusal))),
        },
        "stop_turn" => resolver.respond(as_reply(stop_turn(&assistant, &message))),
        "write_attachment" => resolver.respond(as_reply(write_attachment(&assistant, &message))),
        "remove_attachment" => resolver.respond(as_reply(remove_attachment(&assistant, &message))),
        "sweep_attachments" => resolver.respond(as_reply(sweep_attachments(&assistant, &message))),
        _ => return false,
    }
    true
}

fn as_reply(answer: Answer) -> Result<Value, InvokeError> {
    answer.map_err(InvokeError::from)
}

fn off_main_thread<R: Runtime>(resolver: InvokeResolver<R>, work: impl FnOnce() -> Answer + Send + 'static) {
    resolver.respond_async(async move {
        let done = tauri::async_runtime::spawn_blocking(work).await;
        done.map_err(|failure| failure.to_string()).and_then(|answer| answer).map_err(InvokeError::from)
    });
}

fn read_dropped<R: Runtime>(resolver: InvokeResolver<R>, assistant: Arc<Assistant>, path: String) {
    resolver.respond_async(async move {
        let read = tauri::async_runtime::spawn_blocking(move || drops::read_dropped(&assistant, &path)).await;
        read.map_err(|failure| failure.to_string()).and_then(|bytes| bytes).map(Response::new).map_err(InvokeError::from)
    });
}

fn json_args<R: Runtime>(message: &InvokeMessage<R>) -> Option<&Value> {
    match message.payload() {
        InvokeBody::Json(args) => Some(args),
        InvokeBody::Raw(_) => None,
    }
}

fn argument<'a, R: Runtime>(message: &'a InvokeMessage<R>, name: &str) -> Result<&'a Value, String> {
    json_args(message).and_then(|args| args.get(name)).ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name))
}

fn text_argument<'a, R: Runtime>(message: &'a InvokeMessage<R>, name: &str) -> Result<&'a str, String> {
    argument(message, name)?.as_str().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name))
}

fn number_argument<R: Runtime>(message: &InvokeMessage<R>, name: &str) -> Result<u64, String> {
    argument(message, name)?.as_u64().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name))
}

fn channel_sink<R: Runtime>(message: &InvokeMessage<R>) -> Result<TurnSink, String> {
    let named = text_argument(message, "onEvent")?;
    let id = JavaScriptChannelId::from_str(named).map_err(|_| NOT_A_CHANNEL.to_string())?;
    let channel: Channel<Value> = id.channel_on(message.webview());
    Ok(Arc::new(move |event: Value| drop(channel.send(event))))
}

const NOT_TEXTS: &str = "The call's {name} argument must be a list of texts.";
const NOT_CLAUDE_OPTIONS: &str = "The call's claude argument must hold a mode, a model and an effort.";

struct ClaudeStart {
    mode: String,
    model: String,
    effort: String,
}

struct TurnStart {
    provider_id: String,
    prompt: String,
    resume: Option<String>,
    claude: Option<ClaudeStart>,
    folders: Vec<String>,
    sink: TurnSink,
}

fn texts_argument<R: Runtime>(message: &InvokeMessage<R>, name: &str) -> Result<Vec<String>, String> {
    let Some(held) = json_args(message).and_then(|args| args.get(name)).filter(|held| !held.is_null()) else {
        return Ok(Vec::new());
    };
    let refused = || NOT_TEXTS.replace("{name}", name);
    let rows = held.as_array().ok_or_else(refused)?;
    rows.iter().map(|row| row.as_str().map(str::to_string).ok_or_else(refused)).collect()
}

fn claude_start_of<R: Runtime>(message: &InvokeMessage<R>) -> Result<Option<ClaudeStart>, String> {
    let Some(held) = json_args(message).and_then(|args| args.get("claude")).filter(|held| !held.is_null()) else {
        return Ok(None);
    };
    let text = |name: &str| held.get(name).and_then(Value::as_str).map(str::to_string).ok_or(NOT_CLAUDE_OPTIONS);
    Ok(Some(ClaudeStart { mode: text("mode")?, model: text("model")?, effort: text("effort")? }))
}

fn turn_start_of<R: Runtime>(message: &InvokeMessage<R>) -> Result<TurnStart, String> {
    let resume = json_args(message).and_then(|args| args.get("resume")).and_then(Value::as_str);
    Ok(TurnStart {
        provider_id: text_argument(message, "providerId")?.to_string(),
        prompt: text_argument(message, "prompt")?.to_string(),
        resume: resume.map(str::to_string),
        claude: claude_start_of(message)?,
        folders: texts_argument(message, "folders")?,
        sink: channel_sink(message)?,
    })
}

fn start_turn(assistant: &Assistant, project: Option<&Path>, start: TurnStart) -> Answer {
    let claude = start.claude.as_ref().map(|held| ClaudeAsk { mode: &held.mode, model: &held.model, effort: &held.effort });
    let ask = StartAsk {
        provider_id: &start.provider_id,
        prompt: &start.prompt,
        resume: start.resume.as_deref(),
        claude,
        folders: &start.folders,
    };
    commands::start_turn(assistant, project, &ask, start.sink)
}

fn pick_folder<R: Runtime>(assistant: &Assistant, app: &tauri::AppHandle<R>) -> Answer {
    let Some(picked) = app.dialog().file().blocking_pick_folder() else {
        return Ok(Value::Null);
    };
    let folder = picked.into_path().map_err(|failure| failure.to_string())?;
    commands::remember_picked_folder(assistant, &folder)
}

fn working_folder_of<R: Runtime>(message: &InvokeMessage<R>) -> Option<PathBuf> {
    let webview = message.webview();
    let store = webview.app_handle().try_state::<Store>()?;
    opened_working_folder(&store)
        .map_err(|refusal| eprintln!("[ink-assistant] no working folder: {refusal}"))
        .ok()
}

fn stop_turn<R: Runtime>(assistant: &Assistant, message: &InvokeMessage<R>) -> Answer {
    Ok(commands::stop_turn(assistant, number_argument(message, "turnId")?))
}

fn write_attachment<R: Runtime>(assistant: &Assistant, message: &InvokeMessage<R>) -> Answer {
    let InvokeBody::Raw(bytes) = message.payload() else {
        return Err(NOT_BYTES.into());
    };
    if bytes.len() > MOST_ATTACHMENT_BYTES {
        return Err(TOO_BIG.into());
    }
    let header = message.headers().get(ATTACHMENT_PATH_HEADER).and_then(|value| value.to_str().ok());
    let path = header.ok_or_else(|| MISSING_ARGUMENT.replace("{name}", ATTACHMENT_PATH_HEADER))?;
    commands::write_attachment(assistant, path, bytes)
}

fn remove_attachment<R: Runtime>(assistant: &Assistant, message: &InvokeMessage<R>) -> Answer {
    commands::remove_attachment(assistant, text_argument(message, "path")?)
}

fn sweep_attachments<R: Runtime>(assistant: &Assistant, message: &InvokeMessage<R>) -> Answer {
    commands::sweep_attachments(assistant, number_argument(message, "ageMs")?)
}
