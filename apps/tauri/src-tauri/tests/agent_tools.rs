use serde_json::{json, Value};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::thread;
use widgetarium_host_tauri_lib::agent::hub::AgentHub;
use widgetarium_host_tauri_lib::agent::hub::tool_answer_of;
use widgetarium_host_tauri_lib::agent::{hook, socket};

struct Checks {
    failed: usize,
}

impl Checks {
    fn check<T: PartialEq + std::fmt::Debug>(&mut self, what: &str, got: T, wanted: T) {
        let ok = got == wanted;
        if !ok {
            self.failed += 1;
        }
        let verdict = if ok { "OK  " } else { "!!  " };
        let detail = if ok { String::new() } else { format!("  got {got:?}, want {wanted:?}") };
        println!("{verdict}{what}{detail}");
    }
}

fn scratch(name: &str) -> PathBuf {
    let folder = std::env::temp_dir().join(format!("wg-agent-{}-{name}", std::process::id()));
    let _ = fs::remove_dir_all(&folder);
    fs::create_dir_all(&folder).expect("a scratch folder");
    folder
}

fn check_hook_context(checks: &mut Checks) {
    checks.check("the hook adds the answers as context", hook::context_of("answers")["hookSpecificOutput"]["additionalContext"].as_str(), Some("answers"));
}

fn reply_of(socket: &PathBuf, call: Value) -> Value {
    let mut stream = UnixStream::connect(socket).expect("the app socket answers");
    writeln!(stream, "{call}").expect("a call is sent");
    let mut line = String::new();
    BufReader::new(stream).read_line(&mut line).expect("a reply arrives");
    serde_json::from_str(&line).unwrap_or(Value::Null)
}

fn check_app_socket(checks: &mut Checks) {
    let folder = scratch("socket");
    let hub = Arc::new(AgentHub::new(folder.join("agent.sock")));
    socket::listen(hub.clone()).expect("the socket listens");
    let mode = fs::metadata(&hub.socket).map(|meta| std::os::unix::fs::PermissionsExt::mode(&meta.permissions()) & 0o777);
    checks.check("only the owner may open the socket", mode.ok(), Some(0o600));
    let asked = json!({ "kind": "mcp", "server": "tasks", "headers": {}, "message": {} });
    let mut wrong = asked.clone();
    wrong["token"] = json!("nope");
    checks.check("a wrong token is refused", reply_of(&hub.socket, wrong)["error"].as_str(), Some("This call does not carry the token of the running Sumi."));
    let mut closed = asked.clone();
    closed["token"] = json!(hub.token);
    checks.check("with no window open the call says so", reply_of(&hub.socket, closed)["error"].as_str(), Some("Sumi's window is not open, so the app cannot answer."));
    let odd = json!({ "token": hub.token, "kind": "tool", "tool": "app_state" });
    checks.check("a call of another kind is refused", reply_of(&hub.socket, odd)["ok"].as_bool(), Some(false));
}

fn stand_in_app(socket: PathBuf) -> thread::JoinHandle<Vec<Value>> {
    let listener = UnixListener::bind(&socket).expect("a stand-in app socket");
    thread::spawn(move || {
        let mut calls = Vec::new();
        for _ in 0..2 {
            let (stream, _) = listener.accept().expect("the MCP process connects");
            let mut writer = stream.try_clone().expect("a writable stream");
            let mut line = String::new();
            BufReader::new(stream).read_line(&mut line).expect("the call arrives");
            let call: Value = serde_json::from_str(&line).unwrap_or(Value::Null);
            let reply = json!({ "jsonrpc": "2.0", "id": call["message"]["id"], "result": { "shownTab": "t_42" } });
            drop(writeln!(writer, "{}", json!({ "ok": true, "value": reply })));
            calls.push(call);
        }
        calls
    })
}

fn mcp_replies(socket: &PathBuf) -> Vec<Value> {
    let mut child = Command::new(env!("CARGO_BIN_EXE_widgetarium-host-tauri"))
        .args(["--mcp", "--server", "tasks", "--socket", &socket.to_string_lossy(), "--token", "t0k", "--chat", "chat-7", "--folder", "/work/app", "--model", "opus", "--sandbox", "project", "--writable", "%5B%22%2Fwork%2Fapp%22%5D"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("the binary starts in MCP mode");
    let mut stdin = child.stdin.take().expect("its stdin");
    let requests = [
        json!({ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": { "protocolVersion": "2025-06-18" } }),
        json!({ "jsonrpc": "2.0", "method": "notifications/initialized" }),
        json!({ "jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": { "name": "tasks_agent_one", "arguments": {} } }),
    ];
    for request in &requests {
        writeln!(stdin, "{request}").expect("a request is written");
    }
    drop(stdin);
    let replies = BufReader::new(child.stdout.take().expect("its stdout"))
        .lines()
        .map_while(Result::ok)
        .filter_map(|line| serde_json::from_str(&line).ok())
        .collect();
    drop(child.wait());
    replies
}

fn check_mcp_process(checks: &mut Checks) {
    let folder = scratch("mcp");
    let socket = folder.join("app.sock");
    let app = stand_in_app(socket.clone());
    let replies = mcp_replies(&socket);
    checks.check("a notification is not relayed and gets no reply", replies.len(), 2);
    checks.check("the app's JSON-RPC reply comes back as it is", replies.get(1).map(|reply| reply["result"]["shownTab"].clone()), Some(json!("t_42")));
    let calls = app.join().unwrap_or_default();
    let call = calls.get(1).cloned().unwrap_or(Value::Null);
    checks.check(
        "the relay carries the token, the server, the turn's headers and the message untouched",
        call,
        json!({
            "token": "t0k",
            "kind": "mcp",
            "server": "tasks",
            "headers": {
                "sumi-chat": "chat-7",
                "sumi-folder": "/work/app",
                "sumi-model": "opus",
                "sumi-sandbox": "project",
                "sumi-writable": "%5B%22%2Fwork%2Fapp%22%5D",
            },
            "message": requests_third(),
        }),
    );
    let down = mcp_replies(&folder.join("nobody.sock"));
    checks.check("with Sumi down a call gets a JSON-RPC error naming the server", down.first().and_then(|reply| reply["error"]["message"].as_str()).map(|said| said.contains("MCP server tasks")), Some(true));
}

fn requests_third() -> Value {
    json!({ "jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": { "name": "tasks_agent_one", "arguments": {} } })
}

fn check_tool_answers(checks: &mut Checks) {
    checks.check("a value answers", tool_answer_of(&json!({ "id": 4, "ok": true, "value": { "a": 1 } })), Ok((4, Ok(json!({ "a": 1 })))));
    checks.check("ok with no value is refused", tool_answer_of(&json!({ "id": 4, "ok": true })).is_err(), true);
    checks.check("an ok that is not a boolean is refused", tool_answer_of(&json!({ "id": 4, "ok": "yes", "value": 1 })).is_err(), true);
    checks.check("a refusal with no reason is refused", tool_answer_of(&json!({ "id": 4, "ok": false, "error": "" })).is_err(), true);
    checks.check("a refusal keeps its reason", tool_answer_of(&json!({ "id": 4, "ok": false, "error": "no" })), Ok((4, Err("no".to_string()))));
}

fn main() {
    let mut checks = Checks { failed: 0 };
    check_tool_answers(&mut checks);
    check_hook_context(&mut checks);
    check_app_socket(&mut checks);
    check_mcp_process(&mut checks);
    if checks.failed > 0 {
        println!("{} agent tool checks failed", checks.failed);
        std::process::exit(1);
    }
    println!("all agent tool checks hold");
}
