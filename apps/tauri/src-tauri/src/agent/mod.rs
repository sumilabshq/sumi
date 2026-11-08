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
pub const DISALLOWED_TOOLS: &[&str] = &["AskUserQuestion"];
const MISSING_ARGUMENT: &str = "The call is missing its {name} argument.";
const NOT_A_CHANNEL: &str = "The call's onEvent argument is not a channel.";
const NOT_SERVER_NAMES: &str = "The call's servers argument is not a list of MCP server names.";
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

pub struct TurnHeaders<'a> {
    pub folder: &'a str,
    pub model: Option<&'a str>,
}

pub fn claude_flags(link: &hub::AgentLink, headers: &TurnHeaders) -> Vec<String> {
    vec![
        "--append-system-prompt".into(),
        PROMPT.into(),
        "--mcp-config".into(),
        mcp_config_of(link, headers),
        "--allowedTools".into(),
        allowed_tools(link),
        "--disallowedTools".into(),
        DISALLOWED_TOOLS.join(","),
        "--settings".into(),
        hook::settings_of(link),
    ]
}

pub fn mcp_config_of(link: &hub::AgentLink, headers: &TurnHeaders) -> String {
    let mut servers = serde_json::Map::new();
    for server in &link.servers {
        let mut args = vec![mcp::MCP_FLAG, "--server", server, "--socket", &link.socket, "--token", &link.token, "--chat", &link.chat, "--folder", headers.folder];
        if let Some(model) = headers.model {
            args.extend(["--model", model]);
        }
        servers.insert(server.clone(), json!({ "command": link.exe, "args": args }));
    }
    json!({ "mcpServers": servers }).to_string()
}

pub fn allowed_tools(link: &hub::AgentLink) -> String {
    link.servers.iter().map(|server| format!("mcp__{server}")).collect::<Vec<_>>().join(",")
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
