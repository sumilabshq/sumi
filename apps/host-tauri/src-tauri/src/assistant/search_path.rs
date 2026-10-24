use std::env;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::sync::OnceLock;
use std::thread;
use std::time::Duration;

const PATH_MARK: &str = "__WIDGETARIUM_PATH__";
const FALLBACK_SHELL: &str = "/bin/zsh";
const LOGIN_SHELL_WAIT: Duration = Duration::from_secs(5);
const ANY_EXECUTE_BIT: u32 = 0o111;
const WHERE_TOOLS_INSTALL: [&str; 13] = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    ".local/bin",
    ".bun/bin",
    ".cargo/bin",
    ".deno/bin",
    ".npm-global/bin",
    "bin",
    ".volta/bin",
];

static SEARCH_PATH: OnceLock<String> = OnceLock::new();

pub fn search_path() -> &'static str {
    SEARCH_PATH.get_or_init(|| {
        let home = env::var("HOME").unwrap_or_default();
        let own = env::var("PATH").unwrap_or_default();
        joined_path(&[&login_shell_path(), &own, &well_known_folders(&home)])
    })
}

pub fn find_command(search_path: &str, command: &str) -> Option<PathBuf> {
    search_path
        .split(':')
        .filter(|folder| folder.starts_with('/'))
        .map(|folder| Path::new(folder).join(command))
        .find(|candidate| is_executable(candidate))
}

pub fn joined_path(parts: &[&str]) -> String {
    let mut kept: Vec<&str> = Vec::new();
    for folder in parts.iter().flat_map(|part| part.split(':')) {
        if folder.starts_with('/') && !kept.contains(&folder) {
            kept.push(folder);
        }
    }
    kept.join(":")
}

pub fn path_after_mark(printed: &str) -> &str {
    printed.rsplit_once(PATH_MARK).map(|(_, path)| path.trim()).unwrap_or("")
}

fn well_known_folders(home: &str) -> String {
    let folders: Vec<String> = WHERE_TOOLS_INSTALL
        .iter()
        .map(|folder| if folder.starts_with('/') { folder.to_string() } else { format!("{home}/{folder}") })
        .collect();
    folders.join(":")
}

fn is_executable(candidate: &Path) -> bool {
    candidate.metadata().map(|meta| meta.is_file() && meta.permissions().mode() & ANY_EXECUTE_BIT != 0).unwrap_or(false)
}

// TRADE-OFF: a GUI app starts with launchd's minimal PATH, so the login shell is asked once and a shell that hangs past the wait is abandoned in favour of the well-known folders
fn login_shell_path() -> String {
    let shell = env::var("SHELL").unwrap_or_else(|_| FALLBACK_SHELL.into());
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let printed = Command::new(shell)
            .args(["-lc", &format!("printf '{PATH_MARK}%s' \"$PATH\"")])
            .stdin(Stdio::null())
            .stderr(Stdio::null())
            .output();
        let _ = sender.send(printed.map(|out| String::from_utf8_lossy(&out.stdout).into_owned()));
    });
    match receiver.recv_timeout(LOGIN_SHELL_WAIT) {
        Ok(Ok(printed)) => path_after_mark(&printed).to_string(),
        _ => String::new(),
    }
}
