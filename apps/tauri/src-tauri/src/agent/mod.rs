pub mod hook;
pub mod hub;
pub mod mcp;
pub mod open;
pub mod socket;

use crate::studio_caller::refuse_foreign_caller;
use hub::AgentHub;
use serde_json::Value;
use std::str::FromStr;
use std::sync::Arc;
use tauri::ipc::{Channel, Invoke, InvokeBody, InvokeError, InvokeMessage, JavaScriptChannelId};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Runtime};

pub const PLUGIN_NAME: &str = "agent";
pub const PROMPT: &str = include_str!("sumi-prompt.md");

pub const SOCKET_FILE: &str = "agent-tools.sock";
const MISSING_ARGUMENT: &str = "The call is missing its {name} argument.";
const NOT_A_CHANNEL: &str = "The call's onEvent argument is not a channel.";
const NOT_SERVER_NAMES: &str = "The call's servers argument is not a list of MCP server names.";
const NO_HUB: &str = "The agent tools have not started.";
const NO_STORE: &str = "The agent tools start after the store: register store::init() before agent::init().";

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_NAME)
        .invoke_handler(dispatch)
        .setup(|app, _api| {
            let folder = app.try_state::<crate::store::Store>().ok_or(NO_STORE)?.global_folder();
            std::fs::create_dir_all(&folder)?;
            let hub = Arc::new(AgentHub::new(folder.join(SOCKET_FILE)));
            socket::listen(hub.clone())?;
            app.manage(hub);
            Ok(())
        })
        .build()
}

fn dispatch<R: Runtime>(invoke: Invoke<R>) -> bool {
    let Invoke { message, resolver, .. } = invoke;
    if let Err(refused) = refuse_foreign_caller(message.webview().label()) {
        resolver.reject(refused);
        return true;
    }

    let answer = match message.command() {
        "open_channel" => open_channel(&message),
        "answer" => answer_tool_call(&message),
        _ => return false,
    };
    resolver.respond(answer.map_err(InvokeError::from));
    true
}

fn hub_of<R: Runtime>(message: &InvokeMessage<R>) -> Result<Arc<AgentHub>, String> {
    let app = message.webview().app_handle().clone();
    let held = app.try_state::<Arc<AgentHub>>().ok_or(NO_HUB)?;
    Ok(held.inner().clone())
}

fn json_args<R: Runtime>(message: &InvokeMessage<R>) -> Option<&Value> {
    match message.payload() {
        InvokeBody::Json(args) => Some(args),
        InvokeBody::Raw(_) => None,
    }
}

fn argument<'a, R: Runtime>(message: &'a InvokeMessage<R>, name: &str) -> Result<&'a Value, String> {
    json_args(message).and_then(|args| args.get(name)).ok_or_else(|| missing(name))
}

fn missing(name: &str) -> String {
    MISSING_ARGUMENT.replace("{name}", name)
}

fn open_channel<R: Runtime>(message: &InvokeMessage<R>) -> Result<Value, String> {
    let named = argument(message, "onEvent")?.as_str().ok_or(NOT_A_CHANNEL)?;
    let id = JavaScriptChannelId::from_str(named).map_err(|_| NOT_A_CHANNEL.to_string())?;
    let channel: Channel<Value> = id.channel_on(message.webview());
    let servers = argument(message, "servers")?.as_array().ok_or(NOT_SERVER_NAMES)?;
    let names = servers.iter().map(|name| name.as_str().map(str::to_string).ok_or(NOT_SERVER_NAMES)).collect::<Result<Vec<_>, _>>()?;
    hub_of(message)?.open_studio(channel, names);
    Ok(Value::Null)
}

fn answer_tool_call<R: Runtime>(message: &InvokeMessage<R>) -> Result<Value, String> {
    let args = json_args(message).ok_or_else(|| missing("id"))?;
    let (id, answer) = hub::tool_answer_of(args)?;
    hub_of(message)?.answer(id, answer);
    Ok(Value::Null)
}
