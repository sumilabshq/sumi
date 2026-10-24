use super::attachments::{remove_file, remove_older_than, write_private_file};
use super::paths::attachment_file_in;
use super::providers::{
    allowed, is_session_id, provider_by_id, ClaudeChoice, Provider, TurnAsk, TurnPlaces, EFFORTS, FILES_BY_PATH, MODELS,
    PERMISSION_MODES, PROVIDERS,
};
use super::search_path::{find_command, search_path};
use super::state::Assistant;
use super::turns::{TurnLaunch, TurnSink};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

pub const UNKNOWN_PROVIDER: &str = "This provider is not one Widgetarium can start: {id}";
pub const NO_PROJECT: &str = "No workspace is open, so there is no folder to work in.";
pub const NOTHING_TO_SEND: &str = "There is nothing to send.";
pub const NOT_A_SESSION: &str = "The conversation to resume is not a session id Widgetarium can pass on.";
pub const NOT_ON_THIS_MACHINE: &str = "{command} is not installed on this machine, or is not on the login shell's PATH.";

pub const NOT_ALLOWED: &str = "{what} is not one Widgetarium passes to Claude Code: {value}";
pub const NOT_PICKED: &str = "This folder was not picked in this app, so it is not lent to the agent: {path}";
pub const NO_FOLDER_READS: &str = "{label} cannot read attached folders.";
pub const OPTIONS_ONLY_FOR_CLAUDE: &str = "Mode, model and effort are Claude Code's own; {label} takes none.";
pub const NOT_A_FOLDER: &str = "The picked path is not a folder: {path}";
pub const CLAUDE_CODE: &str = "claude-code";

pub struct ClaudeAsk<'a> {
    pub mode: &'a str,
    pub model: &'a str,
    pub effort: &'a str,
}

pub struct StartAsk<'a> {
    pub provider_id: &'a str,
    pub prompt: &'a str,
    pub resume: Option<&'a str>,
    pub claude: Option<ClaudeAsk<'a>>,
    pub folders: &'a [String],
}

fn is_found(provider: &Provider) -> bool {
    find_command(search_path(), provider.command).is_some()
}

pub fn providers(assistant: &Assistant, project: Option<&Path>) -> Value {
    let facts: Vec<Value> = PROVIDERS.iter().map(|provider| provider.facts(is_found(provider))).collect();
    json!({
        "project": project.map(|project| project.to_string_lossy()),
        "attachmentsFolder": assistant.attachments.to_string_lossy(),
        "providers": facts,
    })
}

fn checked_provider(provider_id: &str) -> Result<&'static Provider, String> {
    provider_by_id(provider_id).ok_or_else(|| UNKNOWN_PROVIDER.replace("{id}", provider_id))
}

fn allowed_or(choices: &[&'static str], what: &str, asked: &str) -> Result<&'static str, String> {
    allowed(choices, asked).ok_or_else(|| NOT_ALLOWED.replace("{what}", what).replace("{value}", asked))
}

pub fn checked_claude(provider: &Provider, asked: Option<&ClaudeAsk>) -> Result<Option<ClaudeChoice>, String> {
    let Some(asked) = asked else {
        return Ok(None);
    };
    if provider.id != CLAUDE_CODE {
        return Err(OPTIONS_ONLY_FOR_CLAUDE.replace("{label}", provider.label));
    }

    Ok(Some(ClaudeChoice {
        mode: allowed_or(&PERMISSION_MODES, "The permission mode", asked.mode)?,
        model: allowed_or(&MODELS, "The model", asked.model)?,
        effort: allowed_or(&EFFORTS, "The effort", asked.effort)?,
    }))
}

pub fn checked_folders(assistant: &Assistant, provider: &Provider, asked: &[String]) -> Result<Vec<PathBuf>, String> {
    if !asked.is_empty() && provider.files != FILES_BY_PATH {
        return Err(NO_FOLDER_READS.replace("{label}", provider.label));
    }

    asked
        .iter()
        .map(|path| {
            let real = Path::new(path).canonicalize().ok().filter(|real| assistant.was_picked(real));
            real.ok_or_else(|| NOT_PICKED.replace("{path}", path))
        })
        .collect()
}

fn checked_ask<'a>(provider: &Provider, ask: &StartAsk<'a>) -> Result<TurnAsk<'a>, String> {
    if ask.prompt.trim().is_empty() {
        return Err(NOTHING_TO_SEND.into());
    }

    if ask.resume.is_some_and(|session| !is_session_id(session)) {
        return Err(NOT_A_SESSION.into());
    }

    let claude = checked_claude(provider, ask.claude.as_ref())?;
    Ok(TurnAsk { prompt: ask.prompt, resume: ask.resume, claude })
}

pub fn remember_picked_folder(assistant: &Assistant, picked: &Path) -> Result<Value, String> {
    let real = picked.canonicalize().map_err(|failure| failure.to_string())?;
    if !real.is_dir() {
        return Err(NOT_A_FOLDER.replace("{path}", &real.to_string_lossy()));
    }

    assistant.remember_picked(real.clone());
    Ok(json!(real.to_string_lossy()))
}

pub fn start_turn(assistant: &Assistant, project: Option<&Path>, ask: &StartAsk, sink: TurnSink) -> Result<Value, String> {
    let provider = checked_provider(ask.provider_id)?;
    let turn_ask = checked_ask(provider, ask)?;
    let folders = checked_folders(assistant, provider, ask.folders)?;
    let project = project.ok_or(NO_PROJECT)?;
    let path = search_path();
    let binary = find_command(path, provider.command).ok_or_else(|| NOT_ON_THIS_MACHINE.replace("{command}", provider.command))?;
    let places = TurnPlaces { project, attachments: &assistant.attachments, folders: &folders };
    let argv = provider.argv(&turn_ask, &places);
    let launch = TurnLaunch { binary: &binary, argv: &argv, cwd: project, search_path: path };
    assistant.turns.start(&launch, sink).map(|turn_id| json!(turn_id))
}

pub fn stop_turn(assistant: &Assistant, turn_id: u64) -> Value {
    assistant.turns.stop(turn_id);
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
