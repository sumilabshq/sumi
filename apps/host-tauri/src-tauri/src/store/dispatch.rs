use super::place;
use super::refusal::Refusal;
use super::workspaces::{self, WORKSPACES_FILE, WORKSPACE_FILE};
use super::{RootKind, Store};
use crate::studio_caller::{is_studio_label, refuse_foreign_caller};
use serde_json::{json, Value};
use tauri::ipc::{Invoke, InvokeBody, InvokeError, InvokeResolver};
use tauri::{AppHandle, Emitter, EventTarget, Manager, Runtime};
use tauri_plugin_dialog::DialogExt;

const DOC_EXTENSION: &str = ".json";
const LINES_EXTENSION: &str = ".jsonl";
const MISSING_ARGUMENT: &str = "the call is missing its {name} argument";
const NO_STORE: &str = "the store has not started";

pub const STORE_CHANGED: &str = "store-changed";

type Answer = Result<Value, Refusal>;

pub struct Call {
    command: String,
    args: Value,
}

impl Call {
    fn text(&self, name: &str) -> Result<&str, Refusal> {
        self.args.get(name).and_then(Value::as_str).ok_or_else(|| missing(name))
    }

    fn number(&self, name: &str) -> Result<u64, Refusal> {
        self.args.get(name).and_then(Value::as_u64).ok_or_else(|| missing(name))
    }

    fn optional_number(&self, name: &str) -> Option<u64> {
        self.args.get(name).and_then(Value::as_u64)
    }

    fn value(&self, name: &str) -> Result<&Value, Refusal> {
        self.args.get(name).ok_or_else(|| missing(name))
    }
}

pub fn handle<R: Runtime>(invoke: Invoke<R>) -> bool {
    let Invoke { message, resolver, .. } = invoke;
    if let Err(refused) = refuse_foreign_caller(message.webview().label()) {
        resolver.reject(refused);
        return true;
    }

    let by = message.webview().label().to_owned();
    let app = message.webview().app_handle().clone();
    let args = match message.payload() {
        InvokeBody::Json(args) => args.clone(),
        InvokeBody::Raw(_) => Value::Null,
    };
    let call = Call {
        command: message.command().to_owned(),
        args,
    };
    if call.command == "attach_workspace_folder" {
        respond_off_main_thread(resolver, move || attach_folder(&app, &call));
        return true;
    }

    let Some(store) = app.try_state::<Store>() else {
        resolver.reject(NO_STORE);
        return true;
    };
    match answer_of(&store, &call) {
        Some(answer) => {
            announce_change(&app, change_of(&call, &answer, &by));
            resolver.respond(as_reply(answer));
        }
        None => return false,
    }
    true
}

pub fn answer_of(store: &Store, call: &Call) -> Option<Answer> {
    let answer = match call.command.as_str() {
        "read" => read(store, call),
        "replace" => replace(store, call),
        "append" => append(store, call),
        "read_lines" => read_lines(store, call),
        "list_workspaces" => list_workspaces(store),
        "open_first_workspace" => workspaces::open_first(store).map(|entry| entry.to_json()),
        "create_workspace" => create_workspace(store, call),
        "rename_workspace" => rename_workspace(store, call),
        "mark_workspace_opened" => mark_workspace_opened(store, call),
        "choose_workspace_folder" => choose_workspace_folder(store, call),
        _ => return None,
    };
    Some(answer)
}

pub fn change_of(call: &Call, answer: &Answer, by: &str) -> Option<Value> {
    if !matches!(call.command.as_str(), "replace" | "append") {
        return None;
    }

    let Ok(answered) = answer else {
        return None;
    };
    Some(json!({
        "root": call.args.get("root")?,
        "file": call.args.get("path")?,
        "rev": answered.get("rev").cloned().unwrap_or(Value::Null),
        "by": by,
    }))
}

fn announce_change<R: Runtime>(app: &AppHandle<R>, change: Option<Value>) {
    let Some(change) = change else {
        return;
    };
    if let Err(failure) = app.emit_filter(STORE_CHANGED, &change, is_studio_target) {
        eprintln!("[ink-store] {change} written → unannounced ({failure})");
    }
}

pub fn is_studio_target(target: &EventTarget) -> bool {
    match target {
        EventTarget::Window { label }
        | EventTarget::Webview { label }
        | EventTarget::WebviewWindow { label }
        | EventTarget::AnyLabel { label } => is_studio_label(label),
        _ => false,
    }
}

fn read(store: &Store, call: &Call) -> Answer {
    let path = call.text("path")?;
    place::require_extension(path, DOC_EXTENSION)?;
    Ok(store.read_doc(&store.place(call.text("root")?, path)?)?.to_json())
}

fn replace(store: &Store, call: &Call) -> Answer {
    let root = call.text("root")?;
    let path = call.text("path")?;
    place::require_extension(path, DOC_EXTENSION)?;
    refuse_reserved(root, path)?;
    let doc = call.value("doc")?.clone();
    let rev = store.replace_doc(&store.place(root, path)?, doc, call.number("baseRev")?, call.text("reason")?)?;
    Ok(json!({ "rev": rev }))
}

fn append(store: &Store, call: &Call) -> Answer {
    let path = call.text("path")?;
    place::require_extension(path, LINES_EXTENSION)?;
    store.append_line(&store.place(call.text("root")?, path)?, call.value("line")?)?;
    Ok(Value::Null)
}

fn read_lines(store: &Store, call: &Call) -> Answer {
    let path = call.text("path")?;
    place::require_extension(path, LINES_EXTENSION)?;
    let place = store.place(call.text("root")?, path)?;
    let limit = usize::try_from(call.number("limit")?).unwrap_or(usize::MAX);
    Ok(store.read_lines(&place, call.optional_number("before"), limit)?.to_json())
}

fn list_workspaces(store: &Store) -> Answer {
    let entries: Vec<Value> = workspaces::list(store)?.iter().map(|entry| entry.to_json()).collect();
    Ok(Value::Array(entries))
}

fn create_workspace(store: &Store, call: &Call) -> Answer {
    Ok(workspaces::create_new(store, call.text("name")?)?.to_json())
}

fn mark_workspace_opened(store: &Store, call: &Call) -> Answer {
    Ok(workspaces::mark_opened(store, call.text("id")?)?.to_json())
}

fn choose_workspace_folder(store: &Store, call: &Call) -> Answer {
    Ok(workspaces::choose_folder(store, call.text("id")?, call.text("folder")?)?.to_json())
}

fn rename_workspace(store: &Store, call: &Call) -> Answer {
    workspaces::rename(store, call.text("id")?, call.text("name")?)?;
    Ok(Value::Null)
}

fn attach_folder<R: Runtime>(app: &AppHandle<R>, call: &Call) -> Answer {
    let id = call.text("id")?;
    let Some(picked) = app.dialog().file().blocking_pick_folder() else {
        return Ok(Value::Null);
    };
    let folder = picked.into_path().map_err(|failure| Refusal::BadPath {
        detail: failure.to_string(),
    })?;
    let store = app.try_state::<Store>().ok_or_else(|| Refusal::Io {
        detail: NO_STORE.to_owned(),
    })?;
    Ok(workspaces::attach_folder(&store, id, &folder)?.to_json())
}

pub fn refuse_reserved(root: &str, path: &str) -> Result<(), Refusal> {
    let reserved = match RootKind::parse(root)? {
        RootKind::Global => WORKSPACES_FILE,
        RootKind::Workspace(_) => WORKSPACE_FILE,
        RootKind::Folder(_) => return Ok(()),
    };
    if path != reserved {
        return Ok(());
    }

    Err(Refusal::Reserved {
        detail: format!("{root}:{path} is written only by the workspace commands"),
    })
}

fn respond_off_main_thread<R: Runtime>(resolver: InvokeResolver<R>, work: impl FnOnce() -> Answer + Send + 'static) {
    resolver.respond_async(async move {
        let done = tauri::async_runtime::spawn_blocking(work).await;
        let answer = done.map_err(|failure| Refusal::Io {
            detail: failure.to_string(),
        });
        as_reply(answer.and_then(|answer| answer))
    });
}

fn as_reply(answer: Answer) -> Result<Value, InvokeError> {
    answer.map_err(|refusal| InvokeError::from(refusal.to_json()))
}

fn missing(name: &str) -> Refusal {
    Refusal::BadCall {
        detail: MISSING_ARGUMENT.replace("{name}", name),
    }
}

pub fn call_of(command: &str, args: Value) -> Call {
    Call {
        command: command.to_owned(),
        args,
    }
}
