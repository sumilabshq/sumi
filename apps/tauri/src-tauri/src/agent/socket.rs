use super::hub::{AgentHub, ToolAnswer};
use serde_json::{json, Value};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::fs::PermissionsExt;
use std::os::unix::net::{UnixListener, UnixStream};
use std::sync::Arc;
use std::thread;

const OWNER_ONLY: u32 = 0o600;
const WRONG_TOKEN: &str = "This call does not carry the token of the running Sumi.";
const NOT_A_CALL: &str = "A call names its token and its kind: mcp with server, headers and message, or between-steps with chat.";

pub fn listen(hub: Arc<AgentHub>) -> Result<(), String> {
    if hub.socket.exists() {
        fs::remove_file(&hub.socket).map_err(|failure| failure.to_string())?;
    }
    let listener = UnixListener::bind(&hub.socket).map_err(|failure| failure.to_string())?;
    fs::set_permissions(&hub.socket, fs::Permissions::from_mode(OWNER_ONLY)).map_err(|failure| failure.to_string())?;
    thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let hub = hub.clone();
            thread::spawn(move || serve_one(&hub, stream));
        }
    });
    Ok(())
}

fn serve_one(hub: &AgentHub, stream: UnixStream) {
    let Ok(mut writer) = stream.try_clone() else {
        return;
    };
    let mut line = String::new();
    if BufReader::new(stream).read_line(&mut line).is_err() {
        return;
    }
    let reply = match answer_call(hub, &line) {
        Ok(value) => json!({ "ok": true, "value": value }),
        Err(refusal) => json!({ "ok": false, "error": refusal }),
    };
    drop(writeln!(writer, "{reply}"));
}

fn answer_call(hub: &AgentHub, line: &str) -> ToolAnswer {
    let mut call: Value = serde_json::from_str(line).map_err(|_| NOT_A_CALL.to_string())?;
    let token = call.as_object_mut().and_then(|fields| fields.remove("token")).ok_or(NOT_A_CALL)?;
    if token.as_str() != Some(hub.token.as_str()) {
        return Err(WRONG_TOKEN.into());
    }

    match call.get("kind").and_then(Value::as_str) {
        Some("mcp") if call.get("server").is_some_and(Value::is_string) && has_text_headers(&call) => hub.ask_studio(call, true),
        Some("between-steps") if call.get("chat").is_some_and(Value::is_string) => hub.ask_studio(call, false),
        _ => Err(NOT_A_CALL.into()),
    }
}

fn has_text_headers(call: &Value) -> bool {
    call.get("headers").and_then(Value::as_object).is_some_and(|headers| headers.values().all(Value::is_string))
}
