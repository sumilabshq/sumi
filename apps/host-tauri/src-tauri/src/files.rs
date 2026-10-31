use super::store::atomic::write_atomically;
use super::studio_caller::refuse_foreign_caller;
use serde::Serialize;
use serde_json::Value;
use std::fs::{self, OpenOptions};
use std::io::{self, ErrorKind, Write};
use std::os::unix::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::ipc::{Invoke, InvokeBody, InvokeError, InvokeMessage};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::Wry;

pub const PLUGIN_NAME: &str = "files";

#[derive(Serialize, Debug, PartialEq, Eq, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum EntryKind {
    File,
    Folder,
}

#[derive(Serialize, Debug, PartialEq, Eq)]
pub struct FolderEntry {
    pub name: String,
    pub kind: EntryKind,
}

#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub exists: bool,
    pub kind: Option<EntryKind>,
    pub size: Option<u64>,
    pub modified_ms: Option<u64>,
}

pub fn refuse_unsafe_path(path: &Path) -> Result<(), String> {
    if path.as_os_str().as_bytes().contains(&0) {
        return Err(format!("The path {} holds a NUL character, so it is refused.", path.display()));
    }

    if !path.is_absolute() {
        return Err(format!("The path {} is not absolute, so it is refused.", path.display()));
    }

    Ok(())
}

fn failed(what: &str, path: &Path, error: &io::Error) -> String {
    if error.kind() == ErrorKind::NotFound {
        return format!("{} does not exist.", path.display());
    }

    format!("Could not {what} {}: {error}.", path.display())
}

fn kind_of(metadata: &fs::Metadata) -> EntryKind {
    if metadata.is_dir() {
        return EntryKind::Folder;
    }

    EntryKind::File
}

fn make_parent_of(path: &Path) -> Result<(), String> {
    let Some(parent) = path.parent() else { return Ok(()) };
    fs::create_dir_all(parent).map_err(|error| failed("create the folder", parent, &error))
}

pub fn read_file(path: &Path) -> Result<String, String> {
    refuse_unsafe_path(path)?;
    let metadata = fs::metadata(path).map_err(|error| failed("read", path, &error))?;

    if metadata.is_dir() {
        return Err(format!("{} is a folder, not a file.", path.display()));
    }

    fs::read_to_string(path).map_err(|error| failed("read", path, &error))
}

pub fn read_folder(path: &Path) -> Result<Vec<FolderEntry>, String> {
    refuse_unsafe_path(path)?;
    let listing = fs::read_dir(path).map_err(|error| failed("list", path, &error))?;
    let mut entries: Vec<FolderEntry> = listing
        .flatten()
        .map(|entry| FolderEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            kind: fs::metadata(entry.path()).map_or(EntryKind::File, |metadata| kind_of(&metadata)),
        })
        .collect();
    entries.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(entries)
}

pub fn file_info(path: &Path) -> Result<FileInfo, String> {
    refuse_unsafe_path(path)?;
    let metadata = match fs::metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            return Ok(FileInfo {
                exists: false,
                kind: None,
                size: None,
                modified_ms: None,
            })
        }
        Err(error) => return Err(failed("read", path, &error)),
    };
    let modified_ms = metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|since| since.as_millis() as u64);
    Ok(FileInfo {
        exists: true,
        kind: Some(kind_of(&metadata)),
        size: Some(metadata.len()),
        modified_ms,
    })
}

pub fn write_file(path: &Path, content: &str) -> Result<(), String> {
    refuse_unsafe_path(path)?;
    make_parent_of(path)?;
    write_atomically(path, content.as_bytes()).map_err(|error| failed("write", path, &error))
}

pub fn append_file(path: &Path, content: &str) -> Result<(), String> {
    refuse_unsafe_path(path)?;
    make_parent_of(path)?;
    let mut file =
        OpenOptions::new().create(true).append(true).open(path).map_err(|error| failed("open", path, &error))?;
    file.write_all(content.as_bytes()).map_err(|error| failed("append to", path, &error))
}

pub fn make_folder(path: &Path) -> Result<(), String> {
    refuse_unsafe_path(path)?;
    fs::create_dir_all(path).map_err(|error| failed("create the folder", path, &error))
}

pub fn remove(path: &Path) -> Result<(), String> {
    refuse_unsafe_path(path)?;
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(failed("remove", path, &error)),
    };
    let removed = if metadata.is_dir() { fs::remove_dir_all(path) } else { fs::remove_file(path) };
    removed.map_err(|error| failed("remove", path, &error))
}

pub fn rename(from: &Path, to: &Path) -> Result<(), String> {
    refuse_unsafe_path(from)?;
    refuse_unsafe_path(to)?;
    make_parent_of(to)?;
    fs::rename(from, to).map_err(|error| failed("move", from, &error))
}

fn copy_tree(from: &Path, to: &Path) -> Result<(), String> {
    let metadata = fs::metadata(from).map_err(|error| failed("copy", from, &error))?;

    if !metadata.is_dir() {
        return fs::copy(from, to).map(|_| ()).map_err(|error| failed("copy", from, &error));
    }

    fs::create_dir_all(to).map_err(|error| failed("create the folder", to, &error))?;
    let listing = fs::read_dir(from).map_err(|error| failed("list", from, &error))?;

    for entry in listing.flatten() {
        copy_tree(&entry.path(), &to.join(entry.file_name()))?;
    }

    Ok(())
}

pub fn copy(from: &Path, to: &Path) -> Result<(), String> {
    refuse_unsafe_path(from)?;
    refuse_unsafe_path(to)?;
    make_parent_of(to)?;
    copy_tree(from, to)
}

fn text_of<'a>(message: &'a InvokeMessage<Wry>, name: &str) -> Result<&'a str, String> {
    let missing = || format!("The files call is missing {name}.");
    let InvokeBody::Json(args) = message.payload() else { return Err(missing()) };
    args.get(name).and_then(Value::as_str).ok_or_else(missing)
}

fn path_of(message: &InvokeMessage<Wry>, name: &str) -> Result<PathBuf, String> {
    text_of(message, name).map(PathBuf::from)
}

fn answered<T: Serialize>(answer: Result<T, String>) -> Result<Value, String> {
    serde_json::to_value(answer?).map_err(|error| error.to_string())
}

fn answer_of(message: &InvokeMessage<Wry>) -> Result<Value, String> {
    match message.command() {
        "read_file" => answered(read_file(&path_of(message, "path")?)),
        "read_folder" => answered(read_folder(&path_of(message, "path")?)),
        "file_info" => answered(file_info(&path_of(message, "path")?)),
        "write_file" => answered(write_file(&path_of(message, "path")?, text_of(message, "content")?)),
        "append_file" => answered(append_file(&path_of(message, "path")?, text_of(message, "content")?)),
        "make_folder" => answered(make_folder(&path_of(message, "path")?)),
        "remove" => answered(remove(&path_of(message, "path")?)),
        "rename" => answered(rename(&path_of(message, "from")?, &path_of(message, "to")?)),
        "copy" => answered(copy(&path_of(message, "from")?, &path_of(message, "to")?)),
        other => Err(format!("The files plugin has no command {other}.")),
    }
}

pub fn init() -> TauriPlugin<Wry> {
    Builder::new(PLUGIN_NAME)
        .invoke_handler(|invoke: Invoke<Wry>| {
            let message = &invoke.message;
            let answer = refuse_foreign_caller(message.webview().label()).and_then(|()| answer_of(message));
            invoke.resolver.respond(answer.map_err(InvokeError::from));
            true
        })
        .build()
}
