use serde_json::{json, Value};
use std::io::{self, BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;

pub const MCP_FLAG: &str = "--mcp";
pub const CHAT_HEADER: &str = "sumi-chat";
pub const FOLDER_HEADER: &str = "sumi-folder";
pub const MODEL_HEADER: &str = "sumi-model";

const INTERNAL_ERROR: i64 = -32603;
const NO_APP: &str = "Sumi is not running, so its MCP server {server} cannot answer: {reason}";
const NOT_AN_ANSWER: &str = "Sumi answered with something that is not an answer.";

pub struct Bridge {
    pub socket: String,
    pub token: String,
}

pub fn is_asked(args: &[String]) -> bool {
    args.iter().any(|arg| arg == MCP_FLAG)
}

struct Relay {
    bridge: Bridge,
    server: String,
    headers: Value,
}

pub fn bridge_of(args: &[String]) -> Bridge {
    let socket = flag_value(args, "--socket");
    let token = flag_value(args, "--token");
    if !socket.is_empty() && !token.is_empty() {
        return Bridge { socket, token };
    }

    let default_socket = std::env::var("HOME").map(|home| std::path::Path::new(&home).join(crate::store::place::APP_FOLDER).join(super::SOCKET_FILE)).unwrap_or_default();
    let token = std::fs::read_to_string(default_socket.with_extension(super::socket::TOKEN_EXTENSION)).unwrap_or_default();
    Bridge { socket: default_socket.to_string_lossy().into_owned(), token: token.trim().to_string() }
}

pub fn serve(args: &[String]) {
    let relay = Relay {
        bridge: bridge_of(args),
        server: flag_value(args, "--server"),
        headers: headers_of(args),
    };
    let stdout = io::stdout();
    for line in BufReader::new(io::stdin()).lines().map_while(Result::ok) {
        let Some(reply) = relay.reply_to(&line) else {
            continue;
        };
        let mut out = stdout.lock();
        drop(writeln!(out, "{reply}"));
        drop(out.flush());
    }
}

impl Relay {
    fn reply_to(&self, line: &str) -> Option<Value> {
        let message = serde_json::from_str::<Value>(line).ok()?;
        let id = message.get("id").cloned()?;
        let call = json!({ "kind": "mcp", "server": self.server, "headers": self.headers, "message": message });
        match call_sumi(&self.bridge, call) {
            Ok(reply) if !reply.is_null() => Some(reply),
            Ok(_) => None,
            Err(reason) => Some(error_reply(id, &NO_APP.replace("{server}", &self.server).replace("{reason}", &reason))),
        }
    }
}

fn headers_of(args: &[String]) -> Value {
    let mut headers = serde_json::Map::new();
    for (flag, header) in [("--chat", CHAT_HEADER), ("--folder", FOLDER_HEADER), ("--model", MODEL_HEADER)] {
        let value = flag_value(args, flag);
        if !value.is_empty() {
            headers.insert(header.to_string(), Value::String(value));
        }
    }
    Value::Object(headers)
}

pub fn flag_value(args: &[String], name: &str) -> String {
    args.iter().position(|arg| arg == name).and_then(|at| args.get(at + 1)).cloned().unwrap_or_default()
}

fn error_reply(id: Value, message: &str) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": INTERNAL_ERROR, "message": message } })
}

pub fn call_sumi(bridge: &Bridge, call: Value) -> Result<Value, String> {
    let failed = |failure: io::Error| failure.to_string();
    let mut stream = UnixStream::connect(&bridge.socket).map_err(failed)?;
    let mut sent = call;
    sent["token"] = Value::String(bridge.token.clone());
    writeln!(stream, "{sent}").map_err(failed)?;
    let mut line = String::new();
    BufReader::new(stream).read_line(&mut line).map_err(failed)?;
    let reply: Value = serde_json::from_str(&line).map_err(|_| NOT_AN_ANSWER.to_string())?;
    if reply.get("ok").and_then(Value::as_bool).ok_or(NOT_AN_ANSWER)? {
        return reply.get("value").cloned().ok_or_else(|| NOT_AN_ANSWER.to_string());
    }

    Err(reply.get("error").and_then(Value::as_str).filter(|reason| !reason.is_empty()).unwrap_or(NOT_AN_ANSWER).to_string())
}
