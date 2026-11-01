use serde_json::{json, Value};
use std::io::{self, BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;

pub const MCP_FLAG: &str = "--mcp";
pub const SERVER_NAME: &str = "sumi";

const TOOLS: &str = include_str!("tools.json");
const FALLBACK_PROTOCOL: &str = "2025-06-18";
const METHOD_NOT_FOUND: i64 = -32601;
const UNKNOWN_METHOD: &str = "Sumi does not know the method {method}.";
const NO_APP: &str = "Sumi is not running, so its tools cannot answer: {reason}";
const NOT_AN_ANSWER: &str = "Sumi answered with something that is not a tool answer.";

struct Bridge {
    socket: String,
    token: String,
    chat: String,
}

pub fn is_asked(args: &[String]) -> bool {
    args.iter().any(|arg| arg == MCP_FLAG)
}

pub fn serve(args: &[String]) {
    let bridge = Bridge {
        socket: flag_value(args, "--socket"),
        token: flag_value(args, "--token"),
        chat: flag_value(args, "--chat"),
    };
    let stdout = io::stdout();
    for line in BufReader::new(io::stdin()).lines().map_while(Result::ok) {
        let Ok(message) = serde_json::from_str::<Value>(&line) else {
            continue;
        };
        let Some(id) = message.get("id").cloned() else {
            continue;
        };
        let reply = reply_to(&bridge, &message, id);
        let mut out = stdout.lock();
        drop(writeln!(out, "{reply}"));
        drop(out.flush());
    }
}

pub fn flag_value(args: &[String], name: &str) -> String {
    args.iter().position(|arg| arg == name).and_then(|at| args.get(at + 1)).cloned().unwrap_or_default()
}

fn reply_to(bridge: &Bridge, message: &Value, id: Value) -> Value {
    let method = message.get("method").and_then(Value::as_str).unwrap_or_default();
    let params = message.get("params").cloned().unwrap_or(Value::Null);
    match method {
        "initialize" => success_reply(id, initialize_result(&params)),
        "tools/list" => success_reply(id, json!({ "tools": tool_list() })),
        "tools/call" => success_reply(id, call_tool(bridge, &params)),
        "ping" => success_reply(id, json!({})),
        _ => json!({
            "jsonrpc": "2.0",
            "id": id,
            "error": { "code": METHOD_NOT_FOUND, "message": UNKNOWN_METHOD.replace("{method}", method) },
        }),
    }
}

fn success_reply(id: Value, value: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": value })
}

fn initialize_result(params: &Value) -> Value {
    let protocol = params.get("protocolVersion").and_then(Value::as_str).unwrap_or(FALLBACK_PROTOCOL);
    json!({
        "protocolVersion": protocol,
        "capabilities": { "tools": {} },
        "serverInfo": { "name": SERVER_NAME, "version": env!("CARGO_PKG_VERSION") },
    })
}

pub fn tool_list() -> Value {
    serde_json::from_str(TOOLS).expect("tools.json is the tool list")
}

fn call_tool(bridge: &Bridge, params: &Value) -> Value {
    let tool = params.get("name").and_then(Value::as_str).unwrap_or_default();
    let input = params.get("arguments").cloned().unwrap_or_else(|| json!({}));
    match asked_app(bridge, tool, input) {
        Ok(value) => json!({ "content": content_of(value) }),
        Err(refusal) => json!({ "content": [{ "type": "text", "text": refusal }], "isError": true }),
    }
}

pub fn content_of(mut value: Value) -> Value {
    let has_png = value.get("png").is_some_and(Value::is_string);
    let Some(png) = value.as_object_mut().filter(|_| has_png).and_then(|fields| fields.remove("png")) else {
        return json!([{ "type": "text", "text": pretty(&value) }]);
    };

    json!([
        { "type": "image", "data": png, "mimeType": "image/png" },
        { "type": "text", "text": pretty(&value) },
    ])
}

fn pretty(value: &Value) -> String {
    serde_json::to_string_pretty(value).unwrap_or_else(|_| value.to_string())
}

fn asked_app(bridge: &Bridge, tool: &str, input: Value) -> Result<Value, String> {
    call_sumi(&bridge.socket, &bridge.token, &bridge.chat, tool, input)
}

pub fn call_sumi(socket: &str, token: &str, chat: &str, tool: &str, input: Value) -> Result<Value, String> {
    let no_app = |failure: io::Error| NO_APP.replace("{reason}", &failure.to_string());
    let mut stream = UnixStream::connect(socket).map_err(no_app)?;
    let call = json!({ "token": token, "chat": chat, "tool": tool, "input": input });
    writeln!(stream, "{call}").map_err(no_app)?;
    let mut line = String::new();
    BufReader::new(stream).read_line(&mut line).map_err(no_app)?;
    let reply: Value = serde_json::from_str(&line).map_err(|_| NOT_AN_ANSWER.to_string())?;
    if reply.get("ok").and_then(Value::as_bool).ok_or(NOT_AN_ANSWER)? {
        return reply.get("value").cloned().ok_or_else(|| NOT_AN_ANSWER.to_string());
    }

    Err(reply.get("error").and_then(Value::as_str).filter(|reason| !reason.is_empty()).unwrap_or(NOT_AN_ANSWER).to_string())
}
