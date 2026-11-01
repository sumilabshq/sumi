use serde_json::{json, Value};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::thread;
use widgetarium_host_tauri_lib::agent::hub::{AgentHub, AgentLink};
use widgetarium_host_tauri_lib::agent::hub::tool_answer_of;
use widgetarium_host_tauri_lib::agent::mcp::{content_of, tool_list};
use widgetarium_host_tauri_lib::agent::{hook, socket, ALLOWED_TOOLS, PROMPT};
use widgetarium_host_tauri_lib::assistant::providers::{provider_by_id, TurnAsk, TurnPlaces};

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

fn link() -> AgentLink {
    AgentLink {
        exe: "/Applications/Sumi.app/sumi".into(),
        socket: "/tmp/sumi.sock".into(),
        token: "t0k".into(),
        chat: "chat-7".into(),
    }
}

fn argv_with_agent(id: &str) -> Vec<String> {
    let (project, attachments) = (PathBuf::from("/work/app"), PathBuf::from("/tmp/attach"));
    let places = TurnPlaces { project: &project, attachments: &attachments, folders: &[] };
    let agent = link();
    let ask = TurnAsk { prompt: "which tabs?", resume: None, claude: None, agent: Some(&agent) };
    provider_by_id(id).expect("a known provider").argv(&ask, &places)
}

fn after(argv: &[String], flag: &str) -> Option<String> {
    argv.iter().position(|arg| arg == flag).and_then(|at| argv.get(at + 1)).cloned()
}

fn check_claude_args(checks: &mut Checks) {
    let argv = argv_with_agent("claude-code");
    checks.check("Claude Code gets Sumi's prompt", after(&argv, "--append-system-prompt").as_deref(), Some(PROMPT));
    checks.check("the person's own settings and CLAUDE.md load", after(&argv, "--setting-sources").as_deref(), Some("user,project,local"));
    let config: Value = serde_json::from_str(&after(&argv, "--mcp-config").unwrap_or_default()).unwrap_or(Value::Null);
    let server = &config["mcpServers"]["sumi"];
    checks.check("the MCP server is the Sumi binary", server["command"].as_str(), Some("/Applications/Sumi.app/sumi"));
    let args: Vec<&str> = server["args"].as_array().map(|all| all.iter().filter_map(Value::as_str).collect()).unwrap_or_default();
    checks.check("it starts in MCP mode for this chat", args, vec!["--mcp", "--socket", "/tmp/sumi.sock", "--token", "t0k", "--chat", "chat-7"]);
    let allowed: Vec<String> = ALLOWED_TOOLS.iter().map(|tool| format!("mcp__sumi__{tool}")).collect();
    checks.check("only Sumi's own tools are allowed", after(&argv, "--allowedTools"), Some(allowed.join(",")));
    checks.check("Claude Code's own question tool is off", after(&argv, "--disallowedTools").as_deref(), Some("AskUserQuestion"));
    let settings: Value = serde_json::from_str(&after(&argv, "--settings").unwrap_or_default()).unwrap_or(Value::Null);
    let hook = settings["hooks"]["PostToolUse"][0]["hooks"][0]["command"].as_str().unwrap_or_default();
    checks.check("a hook after every tool hands over settled answers", hook, "'/Applications/Sumi.app/sumi' '--hook' '--socket' '/tmp/sumi.sock' '--token' 't0k' '--chat' 'chat-7'");
    checks.check("the hook adds the answers as context", hook::context_of("answers")["hookSpecificOutput"]["additionalContext"].as_str(), Some("answers"));
    checks.check("the person's message stays last", argv.last().map(String::as_str), Some("which tabs?"));
    let codex = argv_with_agent("codex");
    checks.check("another provider gets no Claude-only flags", codex.iter().any(|arg| arg == "--mcp-config"), false);
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
    let wrong = reply_of(&hub.socket, json!({ "token": "nope", "chat": "c", "tool": "app_state", "input": {} }));
    checks.check("a wrong token is refused", wrong["error"].as_str(), Some("This call does not carry the token of the running Sumi."));
    let closed = reply_of(&hub.socket, json!({ "token": hub.token, "chat": "c", "tool": "app_state", "input": {} }));
    checks.check("with no window open the call says so", closed["error"].as_str(), Some("Sumi's window is not open, so the app cannot answer."));
}

fn stand_in_app(socket: PathBuf) -> thread::JoinHandle<Value> {
    let listener = UnixListener::bind(&socket).expect("a stand-in app socket");
    thread::spawn(move || {
        let (stream, _) = listener.accept().expect("the MCP process connects");
        let mut writer = stream.try_clone().expect("a writable stream");
        let mut line = String::new();
        BufReader::new(stream).read_line(&mut line).expect("the call arrives");
        drop(writeln!(writer, "{}", json!({ "ok": true, "value": { "shownTab": "t_42" } })));
        serde_json::from_str(&line).unwrap_or(Value::Null)
    })
}

fn mcp_replies(socket: &PathBuf) -> Vec<Value> {
    let mut child = Command::new(env!("CARGO_BIN_EXE_widgetarium-host-tauri"))
        .args(["--mcp", "--socket", &socket.to_string_lossy(), "--token", "t0k", "--chat", "chat-7"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("the binary starts in MCP mode");
    let mut stdin = child.stdin.take().expect("its stdin");
    let requests = [
        json!({ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": { "protocolVersion": "2025-06-18" } }),
        json!({ "jsonrpc": "2.0", "method": "notifications/initialized" }),
        json!({ "jsonrpc": "2.0", "id": 2, "method": "tools/list" }),
        json!({ "jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": { "name": "app_state", "arguments": { "scope": "this-chat" } } }),
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
    checks.check("a notification gets no reply", replies.len(), 3);
    checks.check("initialize echoes the protocol", replies.first().and_then(|reply| reply["result"]["protocolVersion"].as_str()), Some("2025-06-18"));
    let names: Vec<&str> = replies.get(1).and_then(|reply| reply["result"]["tools"].as_array()).map(|tools| tools.iter().filter_map(|tool| tool["name"].as_str()).collect()).unwrap_or_default();
    checks.check("tools/list names exactly the allowed tools", names, ALLOWED_TOOLS.to_vec());
    let text = replies.get(2).and_then(|reply| reply["result"]["content"][0]["text"].as_str()).unwrap_or_default().to_string();
    checks.check("the app's answer comes back as the tool result", text.contains("t_42"), true);
    let call = app.join().unwrap_or(Value::Null);
    checks.check("the call carries token, chat, tool and input", call, json!({ "token": "t0k", "chat": "chat-7", "tool": "app_state", "input": { "scope": "this-chat" } }));
}

fn check_tool_answers(checks: &mut Checks) {
    let listed: Vec<String> = tool_list().as_array().map(|tools| tools.iter().filter_map(|tool| tool["name"].as_str().map(str::to_string)).collect()).unwrap_or_default();
    checks.check("tools.json lists the allowed tools", listed, ALLOWED_TOOLS.iter().map(|tool| tool.to_string()).collect());
    checks.check("a value answers", tool_answer_of(&json!({ "id": 4, "ok": true, "value": { "a": 1 } })), Ok((4, Ok(json!({ "a": 1 })))));
    checks.check("ok with no value is refused", tool_answer_of(&json!({ "id": 4, "ok": true })).is_err(), true);
    checks.check("an ok that is not a boolean is refused", tool_answer_of(&json!({ "id": 4, "ok": "yes", "value": 1 })).is_err(), true);
    checks.check("a refusal with no reason is refused", tool_answer_of(&json!({ "id": 4, "ok": false, "error": "" })).is_err(), true);
    let shot = content_of(json!({ "url": "https://a.example", "png": "iVBOR", "width": 2 }));
    checks.check("a screenshot answers as an image", (shot[0]["type"].as_str(), shot[0]["data"].as_str()), (Some("image"), Some("iVBOR")));
    checks.check("the image's facts follow as text, without the png", shot[1]["text"].as_str().map(|text| text.contains("width") && !text.contains("iVBOR")), Some(true));
    checks.check("a plain answer stays one text block", content_of(json!({ "a": 1 }))[0]["type"].as_str(), Some("text"));
    checks.check("a refusal keeps its reason", tool_answer_of(&json!({ "id": 4, "ok": false, "error": "no" })), Ok((4, Err("no".to_string()))));
}

fn main() {
    let mut checks = Checks { failed: 0 };
    check_tool_answers(&mut checks);
    check_claude_args(&mut checks);
    check_app_socket(&mut checks);
    check_mcp_process(&mut checks);
    if checks.failed > 0 {
        println!("{} agent tool checks failed", checks.failed);
        std::process::exit(1);
    }
    println!("all agent tool checks hold");
}
