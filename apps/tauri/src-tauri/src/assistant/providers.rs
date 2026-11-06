use crate::agent::claude_flags;
use crate::agent::hub::AgentLink;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};

pub const CLAUDE_STREAM: &str = "claude-stream";
pub const PLAIN_TEXT: &str = "text";
pub const FILES_BY_PATH: &str = "path";
pub const FILES_NOT_READ: &str = "none";

pub const PERMISSION_MODES: [&str; 4] = ["manual", "acceptEdits", "plan", "auto"];
pub const MODELS: [&str; 4] = ["opus", "sonnet", "haiku", "fable"];
pub const EFFORTS: [&str; 5] = ["low", "medium", "high", "xhigh", "max"];

pub struct TurnPlaces<'a> {
    pub project: &'a Path,
    pub attachments: &'a Path,
    pub folders: &'a [PathBuf],
}

pub struct ClaudeChoice {
    pub mode: &'static str,
    pub model: &'static str,
    pub effort: &'static str,
}

pub struct TurnAsk<'a> {
    pub prompt: &'a str,
    pub resume: Option<&'a str>,
    pub claude: Option<ClaudeChoice>,
    pub agent: Option<&'a AgentLink>,
}

pub fn allowed(choices: &[&'static str], asked: &str) -> Option<&'static str> {
    choices.iter().copied().find(|choice| *choice == asked)
}

type ArgsOf = fn(&TurnAsk, &TurnPlaces) -> Vec<String>;

pub struct Provider {
    pub id: &'static str,
    pub label: &'static str,
    pub command: &'static str,
    pub output_format: &'static str,
    pub reads_images: bool,
    pub files: &'static str,
    pub resumes_without_an_id: bool,
    pub compacts: bool,
    args_of: ArgsOf,
}

// TODO: the custom command and the Ollama endpoint from the Obsidian presets are not offered in Tauri yet; a custom command needs its own consent flow before the webview may name a binary
pub const PROVIDERS: [Provider; 4] = [
    Provider {
        id: "claude-code",
        label: "Claude Code",
        command: "claude",
        output_format: CLAUDE_STREAM,
        reads_images: true,
        files: FILES_BY_PATH,
        resumes_without_an_id: false,
        compacts: true,
        args_of: claude_args,
    },
    Provider {
        id: "codex",
        label: "Codex",
        command: "codex",
        output_format: PLAIN_TEXT,
        reads_images: false,
        files: FILES_NOT_READ,
        resumes_without_an_id: false,
        compacts: false,
        args_of: codex_args,
    },
    Provider {
        id: "opencode",
        label: "OpenCode",
        command: "opencode",
        output_format: PLAIN_TEXT,
        reads_images: false,
        files: FILES_NOT_READ,
        resumes_without_an_id: true,
        compacts: false,
        args_of: opencode_args,
    },
    Provider {
        id: "gemini",
        label: "Gemini CLI",
        command: "gemini",
        output_format: PLAIN_TEXT,
        reads_images: false,
        files: FILES_BY_PATH,
        resumes_without_an_id: true,
        compacts: false,
        args_of: gemini_args,
    },
];

const MOST_SESSION_CHARS: usize = 128;
const END_OF_OPTIONS: &str = "--";

pub fn provider_by_id(id: &str) -> Option<&'static Provider> {
    PROVIDERS.iter().find(|provider| provider.id == id)
}

pub fn is_session_id(said: &str) -> bool {
    let fits = said.len() <= MOST_SESSION_CHARS;
    let starts_plain = said.chars().next().is_some_and(|c| c.is_ascii_alphanumeric());
    fits && starts_plain && said.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

impl Provider {
    pub fn argv(&self, ask: &TurnAsk, places: &TurnPlaces) -> Vec<String> {
        (self.args_of)(ask, places)
    }

    pub fn facts(&self, found: bool) -> Value {
        json!({
            "id": self.id,
            "label": self.label,
            "found": found,
            "outputFormat": self.output_format,
            "resumesWithoutAnId": self.resumes_without_an_id,
            "compacts": self.compacts,
            "reads": { "images": self.reads_images, "files": self.files },
        })
    }
}

fn shown(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

// TRADE-OFF: a prompt that starts with a dash would be read as an option by CLIs that take no end-of-options marker here, so it gets one leading space
fn not_an_option(prompt: &str) -> String {
    if prompt.starts_with('-') {
        return format!(" {prompt}");
    }

    prompt.to_string()
}

fn claude_args(ask: &TurnAsk, places: &TurnPlaces) -> Vec<String> {
    let fixed = [
        "-p",
        "--output-format",
        "stream-json",
        "--verbose",
        "--include-partial-messages",
        "--setting-sources",
        "user,project,local",
    ];
    let mut argv: Vec<String> = fixed.iter().map(|part| part.to_string()).collect();
    argv.extend(folder_args(places));
    if let Some(choice) = &ask.claude {
        argv.extend(["--permission-mode".into(), choice.mode.into(), "--model".into(), choice.model.into()]);
        argv.extend(["--effort".into(), choice.effort.into()]);
    }
    if let Some(agent) = ask.agent {
        argv.extend(claude_flags(agent));
    }
    if let Some(session) = ask.resume {
        argv.extend(["--resume".into(), session.to_string()]);
    }
    argv.extend([END_OF_OPTIONS.into(), ask.prompt.to_string()]);
    argv
}

fn folder_args(places: &TurnPlaces) -> Vec<String> {
    [places.project, places.attachments].into_iter().chain(places.folders.iter().map(PathBuf::as_path)).flat_map(|folder| ["--add-dir".to_string(), shown(folder)]).collect()
}

fn codex_args(ask: &TurnAsk, places: &TurnPlaces) -> Vec<String> {
    let mut argv = vec!["exec".into(), "--cd".into(), shown(places.project), "--skip-git-repo-check".into()];
    if let Some(session) = ask.resume {
        argv.extend(["resume".into(), session.to_string()]);
    }
    argv.push(not_an_option(ask.prompt));
    argv
}

fn opencode_args(ask: &TurnAsk, places: &TurnPlaces) -> Vec<String> {
    let mut argv = vec!["run".into(), "--dir".into(), shown(places.project)];
    if ask.resume.is_some() {
        argv.push("--continue".into());
    }
    argv.push(not_an_option(ask.prompt));
    argv
}

fn gemini_args(ask: &TurnAsk, places: &TurnPlaces) -> Vec<String> {
    let mut argv = vec![
        format!("--prompt={}", ask.prompt),
        "--include-directories".into(),
        shown(places.project),
        "--include-directories".into(),
        shown(places.attachments),
    ];
    for folder in places.folders {
        argv.extend(["--include-directories".into(), shown(folder)]);
    }
    if ask.resume.is_some() {
        argv.extend(["--resume".into(), "latest".into()]);
    }
    argv
}
