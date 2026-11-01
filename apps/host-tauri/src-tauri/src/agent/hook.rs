use super::hub::AgentLink;
use super::mcp;
use serde_json::{json, Value};
use std::io::{self, Read};

pub const HOOK_FLAG: &str = "--hook";
pub const SETTLED_TOOL: &str = "questions_settled";

const HOOK_TIMEOUT_SECONDS: u64 = 10;

pub fn is_asked(args: &[String]) -> bool {
    args.iter().any(|arg| arg == HOOK_FLAG)
}

pub fn settings_of(link: &AgentLink) -> String {
    let command = [link.exe.as_str(), HOOK_FLAG, "--socket", &link.socket, "--token", &link.token, "--chat", &link.chat].map(shell_quoted).join(" ");
    let hook = json!({ "type": "command", "command": command, "timeout": HOOK_TIMEOUT_SECONDS });
    json!({ "hooks": { "PostToolUse": [{ "matcher": "*", "hooks": [hook] }] } }).to_string()
}

pub fn run(args: &[String]) {
    drop(io::stdin().read_to_string(&mut String::new()));
    let Some(text) = settled_text(args) else {
        return;
    };

    println!("{}", context_of(&text));
}

pub fn context_of(text: &str) -> Value {
    json!({ "hookSpecificOutput": { "hookEventName": "PostToolUse", "additionalContext": text } })
}

fn settled_text(args: &[String]) -> Option<String> {
    let answer = mcp::call_sumi(&mcp::flag_value(args, "--socket"), &mcp::flag_value(args, "--token"), &mcp::flag_value(args, "--chat"), SETTLED_TOOL, json!({}));
    let value = answer.map_err(|refusal| eprintln!("[questions] hook: {refusal}")).ok()?;
    value.get("text").and_then(Value::as_str).filter(|text| !text.is_empty()).map(str::to_string)
}

fn shell_quoted(part: &str) -> String {
    format!("'{}'", part.replace('\'', "'\\''"))
}
