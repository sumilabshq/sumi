use std::fs;
use std::path::{Path, PathBuf};

pub const NOT_AN_ID: &str = "A session or agent id holds only letters, digits, dashes and underscores.";
pub const NO_TRANSCRIPT: &str = "Claude Code kept no transcript for agent {agent} of session {session}.";
const MOST_TRANSCRIPT_BYTES: u64 = 20 * 1024 * 1024;
const TOO_BIG: &str = "The agent's transcript is over 20 MB, too big to show.";
const MOST_ID_CHARS: usize = 128;

pub fn claude_folder() -> PathBuf {
    if let Ok(configured) = std::env::var("CLAUDE_CONFIG_DIR") {
        return PathBuf::from(configured);
    }
    PathBuf::from(std::env::var("HOME").unwrap_or_default()).join(".claude")
}

fn is_id(text: &str) -> bool {
    !text.is_empty() && text.len() <= MOST_ID_CHARS && text.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn agent_transcript_in(claude: &Path, session: &str, agent: &str) -> Result<String, String> {
    if !is_id(session) || !is_id(agent) {
        return Err(NOT_AN_ID.to_string());
    }

    let file_name = format!("agent-{agent}.jsonl");
    let projects = fs::read_dir(claude.join("projects")).map_err(|failure| failure.to_string())?;
    let found = projects
        .flatten()
        .map(|project| project.path().join(session).join("subagents").join(&file_name))
        .find(|path| path.is_file())
        .ok_or_else(|| NO_TRANSCRIPT.replace("{agent}", agent).replace("{session}", session))?;
    let size = fs::metadata(&found).map_err(|failure| failure.to_string())?.len();
    if size > MOST_TRANSCRIPT_BYTES {
        return Err(TOO_BIG.to_string());
    }

    fs::read_to_string(found).map_err(|failure| failure.to_string())
}
