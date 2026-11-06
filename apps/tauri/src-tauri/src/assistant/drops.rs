use super::state::Assistant;
use serde_json::{json, Value};
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};

pub const NOT_DROPPED: &str = "This file was not dropped on the chat, so it is not read: {path}";
pub const NOT_A_FILE: &str = "The dropped path is not a file: {path}";
pub const NOT_ACCEPTED: &str =
    "{name} can't be attached: only images (png, jpg, gif, webp) and text files (md, txt, json, ts, tsx, js, css, html, csv) can";
pub const TOO_LARGE: &str = "{name} is over the {limit} limit for {what}";
pub const LARGEST_IMAGE_BYTES: u64 = 10 * 1024 * 1024;
pub const LARGEST_TEXT_BYTES: u64 = 1024 * 1024;

const IMAGE_EXTENSIONS: [&str; 5] = ["png", "jpg", "jpeg", "gif", "webp"];
const TEXT_EXTENSIONS: [&str; 9] = ["md", "txt", "json", "ts", "tsx", "js", "css", "html", "csv"];

struct Limit {
    bytes: u64,
    said: &'static str,
    what: &'static str,
}

const IMAGE_LIMIT: Limit = Limit { bytes: LARGEST_IMAGE_BYTES, said: "10 MB", what: "an image" };
const TEXT_LIMIT: Limit = Limit { bytes: LARGEST_TEXT_BYTES, said: "1 MB", what: "a text file" };

fn limit_of(name: &str) -> Option<Limit> {
    let extension = name.rsplit_once('.').map(|(_, extension)| extension.to_lowercase())?;
    if IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return Some(IMAGE_LIMIT);
    }
    TEXT_EXTENSIONS.contains(&extension.as_str()).then_some(TEXT_LIMIT)
}

pub fn dropped_file_refusal(name: &str, size: u64) -> Option<String> {
    let Some(limit) = limit_of(name) else {
        return Some(NOT_ACCEPTED.replace("{name}", name));
    };
    if size <= limit.bytes {
        return None;
    }
    Some(TOO_LARGE.replace("{name}", name).replace("{limit}", limit.said).replace("{what}", limit.what))
}

fn name_of(path: &Path) -> String {
    path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default()
}

fn real_with_metadata(path: &str) -> Option<(PathBuf, fs::Metadata)> {
    let real = Path::new(path).canonicalize().ok()?;
    let held = fs::metadata(&real).ok()?;
    Some((real, held))
}

pub fn drop_paths(assistant: &Assistant, asked: &[String]) -> Value {
    let mut files: Vec<PathBuf> = Vec::new();
    let mut entries: Vec<Value> = Vec::new();
    for path in asked {
        let Some((real, held)) = real_with_metadata(path) else {
            eprintln!("[ink-assistant] dropped path skipped, it cannot be read: {path}");
            continue;
        };
        let shown = real.to_string_lossy().into_owned();
        if held.is_dir() {
            assistant.remember_picked(real.clone());
            entries.push(json!({ "path": shown, "name": name_of(&real), "kind": "folder", "size": 0 }));
            continue;
        }
        if held.is_file() {
            entries.push(json!({ "path": shown, "name": name_of(&real), "kind": "file", "size": held.len() }));
            files.push(real);
        }
    }
    assistant.replace_dropped(files);
    Value::Array(entries)
}

pub fn read_dropped(assistant: &Assistant, asked: &str) -> Result<Vec<u8>, String> {
    let refused = || NOT_DROPPED.replace("{path}", asked);
    let real = Path::new(asked).canonicalize().map_err(|_| refused())?;
    if !assistant.was_dropped(&real) {
        return Err(refused());
    }
    let held = fs::metadata(&real).map_err(|failure| failure.to_string())?;
    if !held.is_file() {
        return Err(NOT_A_FILE.replace("{path}", asked));
    }
    let name = name_of(&real);
    if let Some(refusal) = dropped_file_refusal(&name, held.len()) {
        return Err(refusal);
    }
    let largest = limit_of(&name).map_or(0, |limit| limit.bytes);
    let mut bytes = Vec::new();
    let file = File::open(&real).map_err(|failure| failure.to_string())?;
    file.take(largest + 1).read_to_end(&mut bytes).map_err(|failure| failure.to_string())?;
    match dropped_file_refusal(&name, bytes.len() as u64) {
        Some(refusal) => Err(refusal),
        None => Ok(bytes),
    }
}
