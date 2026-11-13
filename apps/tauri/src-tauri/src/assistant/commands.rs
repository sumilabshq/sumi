use super::attachments::{remove_file, remove_older_than, write_private_file};
use super::paths::attachment_file_in;
use super::providers::{Provider, PROVIDERS};
use super::state::Assistant;
use crate::agent::hook::HOOK_FLAG;
use crate::agent::hub::AgentLink;
use crate::agent::mcp::MCP_FLAG;
use crate::agent::PROMPT;
use crate::login_path::{find_command, search_path};
use crate::process_runs::{ProcessLaunch, ProcessSink};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

pub const NO_PROJECT: &str = "No workspace is open, so there is no folder to work in.";
pub const NOT_ON_THIS_MACHINE: &str = "{command} is not installed on this machine, or is not on the login shell's PATH.";
pub const NOT_PICKED: &str = "This folder was not picked in this app, so it is not lent to the agent: {path}";
pub const NOT_A_FOLDER: &str = "The picked path is not a folder: {path}";

pub struct LaunchAsk {
    pub program: String,
    pub args: Vec<String>,
    pub env: Vec<(String, String)>,
}

fn is_found(provider: &Provider) -> bool {
    find_command(search_path(), provider.command).is_some()
}

fn shown(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

pub fn providers(assistant: &Assistant, project: Option<&Path>) -> Value {
    let facts: Vec<Value> = PROVIDERS.iter().map(|provider| provider.facts(is_found(provider))).collect();
    json!({
        "project": project.map(|project| project.to_string_lossy()),
        "attachmentsFolder": assistant.attachments.to_string_lossy(),
        "providers": facts,
    })
}

pub fn checked_folders(assistant: &Assistant, asked: &[String]) -> Result<Vec<PathBuf>, String> {
    asked
        .iter()
        .map(|path| {
            let real = Path::new(path).canonicalize().ok().filter(|real| assistant.was_picked(real));
            real.ok_or_else(|| NOT_PICKED.replace("{path}", path))
        })
        .collect()
}

fn link_facts(link: &AgentLink) -> Value {
    json!({
        "exe": link.exe,
        "socket": link.socket,
        "token": link.token,
        "chat": link.chat,
        "servers": link.servers,
        "systemPrompt": PROMPT,
        "mcpFlag": MCP_FLAG,
        "hookFlag": HOOK_FLAG,
    })
}

pub fn turn_facts(assistant: &Assistant, project: Option<&Path>, folders: &[String], link: Option<&AgentLink>) -> Result<Value, String> {
    let project = project.ok_or(NO_PROJECT)?;
    let folders: Vec<String> = checked_folders(assistant, folders)?.iter().map(|folder| shown(folder)).collect();
    Ok(json!({
        "project": shown(project),
        "attachments": shown(&assistant.attachments),
        "folders": folders,
        "link": link.map(link_facts),
    }))
}

pub fn start_launch(assistant: &Assistant, project: Option<&Path>, launch: &LaunchAsk, sink: ProcessSink) -> Result<Value, String> {
    let project = project.ok_or(NO_PROJECT)?;
    let path = search_path();
    let binary = find_command(path, &launch.program).ok_or_else(|| NOT_ON_THIS_MACHINE.replace("{command}", &launch.program))?;
    let process = ProcessLaunch { binary: &binary, argv: &launch.args, cwd: project, search_path: path, env: &launch.env };
    let run_id = assistant.turns.start(&process, sink)?;
    eprintln!("[ink-assistant] turn {run_id}: none → running ({})", launch.program);
    Ok(json!(run_id))
}

pub fn remember_picked_folder(assistant: &Assistant, picked: &Path) -> Result<Value, String> {
    let real = picked.canonicalize().map_err(|failure| failure.to_string())?;
    if !real.is_dir() {
        return Err(NOT_A_FOLDER.replace("{path}", &real.to_string_lossy()));
    }

    assistant.remember_picked(real.clone());
    Ok(json!(real.to_string_lossy()))
}

pub fn stop_turn(assistant: &Assistant, run_id: u64) -> Value {
    assistant.turns.stop(run_id);
    Value::Null
}

pub fn write_attachment(assistant: &Assistant, asked: &str, bytes: &[u8]) -> Result<Value, String> {
    let path = attachment_file_in(&assistant.attachments, asked)?;
    write_private_file(&path, bytes).map_err(|failure| failure.to_string())?;
    Ok(Value::Null)
}

pub fn remove_attachment(assistant: &Assistant, asked: &str) -> Result<Value, String> {
    let path = attachment_file_in(&assistant.attachments, asked)?;
    remove_file(&path).map_err(|failure| failure.to_string())?;
    Ok(Value::Null)
}

pub fn sweep_attachments(assistant: &Assistant, age_ms: u64) -> Result<Value, String> {
    let folder: &Path = &assistant.attachments;
    let removed = remove_older_than(folder, Duration::from_millis(age_ms), SystemTime::now());
    removed.map(|count| json!(count)).map_err(|failure| failure.to_string())
}
