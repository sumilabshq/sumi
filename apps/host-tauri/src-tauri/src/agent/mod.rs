pub mod hook;
pub mod hub;
pub mod mcp;
pub mod socket;

use crate::studio_caller::refuse_foreign_caller;
use hub::AgentHub;
use serde_json::{json, Value};
use std::str::FromStr;
use std::sync::Arc;
use tauri::ipc::{Channel, Invoke, InvokeBody, InvokeError, InvokeMessage, JavaScriptChannelId};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Runtime};

pub const PLUGIN_NAME: &str = "agent";
pub const PROMPT: &str = include_str!("sumi-prompt.md");

const SOCKET_FILE: &str = "agent-tools.sock";
pub const ALLOWED_TOOLS: &[&str] = &[
    "app_state",
    "apps_list",
    "tab_open",
    "tab_duplicate",
    "tab_update",
    "tab_close",
    "tab_access",
    "tab_read",
    "group_create",
    "group_update",
    "group_delete",
    "task_search",
    "task_list",
    "task_get",
    "task_create",
    "task_update",
    "task_start",
    "task_step",
    "task_check",
    "task_attach",
    "task_move",
    "ask_needed",
    "ask_optional",
];
pub const DISALLOWED_TOOLS: &[&str] = &["AskUserQuestion"];
const MISSING_ARGUMENT: &str = "The call is missing its {name} argument.";
const NOT_A_CHANNEL: &str = "The call's onEvent argument is not a channel.";
const NO_HUB: &str = "The agent tools have not started.";

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_NAME)
        .invoke_handler(dispatch)
        .setup(|app, _api| {
            let folder = app.path().app_data_dir()?;
            std::fs::create_dir_all(&folder)?;
            let hub = Arc::new(AgentHub::new(folder.join(SOCKET_FILE)));
            socket::listen(hub.clone())?;
            app.manage(hub);
            Ok(())
        })
        .build()
}

pub fn claude_flags(link: &hub::AgentLink) -> Vec<String> {
    vec![
        "--append-system-prompt".into(),
        PROMPT.into(),
        "--mcp-config".into(),
        mcp_config_of(link),
        "--allowedTools".into(),
        allowed_tools(),
        "--disallowedTools".into(),
        DISALLOWED_TOOLS.join(","),
        "--settings".into(),
        hook::settings_of(link),
    ]
}

pub fn mcp_config_of(link: &hub::AgentLink) -> String {
    let args = [mcp::MCP_FLAG, "--socket", &link.socket, "--token", &link.token, "--chat", &link.chat];
    let mut servers = serde_json::Map::new();
    servers.insert(mcp::SERVER_NAME.to_string(), json!({ "command": link.exe, "args": args }));
    json!({ "mcpServers": servers }).to_string()
}

pub fn allowed_tools() -> String {
    ALLOWED_TOOLS.iter().map(|tool| format!("mcp__{}__{tool}", mcp::SERVER_NAME)).collect::<Vec<_>>().join(",")
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
    hub_of(message)?.open_studio(channel);
    Ok(Value::Null)
}

fn answer_tool_call<R: Runtime>(message: &InvokeMessage<R>) -> Result<Value, String> {
    let args = json_args(message).ok_or_else(|| missing("id"))?;
    let (id, answer) = hub::tool_answer_of(args)?;
    hub_of(message)?.answer(id, answer);
    Ok(Value::Null)
}
