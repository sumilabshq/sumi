use super::store::atomic::write_atomically;
use super::studio_caller::refuse_foreign_caller;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::Serialize;
use serde_json::Value;
use std::fs::{self, OpenOptions};
use std::io::{self, ErrorKind, Read, Write};
use std::os::unix::ffi::OsStrExt;
use std::os::unix::fs::{MetadataExt, OpenOptionsExt};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::UNIX_EPOCH;
use tauri::ipc::{Invoke, InvokeBody, InvokeError};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_dialog::DialogExt;

pub const PLUGIN_NAME: &str = "files";

const PICK_FOLDER: &str = "pick_folder";

pub const MAX_PATH_BYTES: usize = 4096;

pub const MAX_CONTENT_BYTES: u64 = 16 * 1024 * 1024;

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
    pub identity: Option<String>,
}

pub fn refuse_unsafe_path(path: &Path) -> Result<(), String> {
    if path.as_os_str().as_bytes().contains(&0) {
        return Err(format!("The path {} holds a NUL character, so it is refused.", path.display()));
    }

    if path.as_os_str().len() > MAX_PATH_BYTES {
        return Err(format!("A path longer than {MAX_PATH_BYTES} bytes is refused."));
    }

    if !path.is_absolute() {
        return Err(format!("The path {} is not absolute, so it is refused.", path.display()));
    }

    Ok(())
}

fn refuse_oversized(path: &Path, bytes: u64) -> Result<(), String> {
    if bytes > MAX_CONTENT_BYTES {
        return Err(format!("{} is larger than {MAX_CONTENT_BYTES} bytes, so it is refused.", path.display()));
    }

    Ok(())
}

fn resolved(path: &Path) -> Result<PathBuf, String> {
    let mut existing = path;
    let mut rest = Vec::new();

    loop {
        if let Ok(real) = fs::canonicalize(existing) {
            return Ok(rest.iter().rev().fold(real, |whole, part| whole.join(part)));
        }

        let (Some(parent), Some(name)) = (existing.parent(), existing.file_name()) else {
            return Err(format!("Could not resolve {}.", path.display()));
        };
        rest.push(name);
        existing = parent;
    }
}

fn refuse_into_itself(from: &Path, to: &Path) -> Result<(), String> {
    let source = fs::canonicalize(from).map_err(|error| failed("resolve", from, &error))?;

    if resolved(to)?.starts_with(&source) {
        return Err(format!("{} cannot go into itself at {}.", from.display(), to.display()));
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

    if !metadata.is_file() {
        return Err(format!("{} is not a regular file, so it is not read.", path.display()));
    }

    refuse_oversized(path, metadata.len())?;
    let file = OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_NONBLOCK)
        .open(path)
        .map_err(|error| failed("read", path, &error))?;
    let opened = file.metadata().map_err(|error| failed("read", path, &error))?;

    if !opened.is_file() {
        return Err(format!("{} is not a regular file, so it is not read.", path.display()));
    }

    let mut text = String::new();
    file.take(MAX_CONTENT_BYTES + 1).read_to_string(&mut text).map_err(|error| failed("read", path, &error))?;
    refuse_oversized(path, text.len() as u64)?;
    Ok(text)
}

pub fn read_file_bytes(path: &Path) -> Result<String, String> {
    refuse_unsafe_path(path)?;
    let metadata = fs::metadata(path).map_err(|error| failed("read", path, &error))?;

    if !metadata.is_file() {
        return Err(format!("{} is not a regular file, so it is not read.", path.display()));
    }

    refuse_oversized(path, metadata.len())?;
    let mut bytes = Vec::new();
    fs::File::open(path)
        .and_then(|file| file.take(MAX_CONTENT_BYTES + 1).read_to_end(&mut bytes))
        .map_err(|error| failed("read", path, &error))?;
    refuse_oversized(path, bytes.len() as u64)?;
    Ok(BASE64.encode(bytes))
}

pub fn open_in_system_app(path: &Path) -> Result<(), String> {
    refuse_unsafe_path(path)?;
    let opened = Command::new("open").arg(path).status().map_err(|error| failed("open", path, &error))?;

    if !opened.success() {
        return Err(format!("{} did not open in its system app ({opened}).", path.display()));
    }

    Ok(())
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

fn identity_of(metadata: &fs::Metadata) -> String {
    format!("{}:{}", metadata.dev(), metadata.ino())
}

fn is_identity(path: &Path, identity: &str) -> bool {
    fs::symlink_metadata(path).is_ok_and(|metadata| identity_of(&metadata) == identity)
}

pub fn locate_file(path: &Path, identity: &str) -> Result<Option<String>, String> {
    refuse_unsafe_path(path)?;
    if is_identity(path, identity) {
        return Ok(Some(path.to_string_lossy().into_owned()));
    }

    let Some(folder) = path.parent() else {
        return Ok(None);
    };
    let Ok(entries) = fs::read_dir(folder) else {
        return Ok(None);
    };
    let moved = entries.flatten().map(|entry| entry.path()).find(|sibling| is_identity(sibling, identity));
    Ok(moved.map(|found| found.to_string_lossy().into_owned()))
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
                identity: None,
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
        identity: Some(identity_of(&metadata)),
    })
}

pub fn write_file(path: &Path, content: &str) -> Result<(), String> {
    refuse_unsafe_path(path)?;
    refuse_oversized(path, content.len() as u64)?;
    make_parent_of(path)?;
    write_atomically(path, content.as_bytes()).map_err(|error| failed("write", path, &error))
}

pub fn append_file(path: &Path, content: &str) -> Result<(), String> {
    refuse_unsafe_path(path)?;
    refuse_oversized(path, content.len() as u64)?;
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
    refuse_into_itself(from, to)?;
    make_parent_of(to)?;
    fs::rename(from, to).map_err(|error| failed("move", from, &error))
}

fn copy_tree(from: &Path, to: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(from).map_err(|error| failed("copy", from, &error))?;

    if metadata.file_type().is_symlink() {
        let target = fs::read_link(from).map_err(|error| failed("read the link", from, &error))?;
        return std::os::unix::fs::symlink(target, to).map_err(|error| failed("link", to, &error));
    }

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
    refuse_into_itself(from, to)?;
    make_parent_of(to)?;
    copy_tree(from, to)
}

fn text_of<'a>(args: &'a Value, name: &str) -> Result<&'a str, String> {
    args.get(name).and_then(Value::as_str).ok_or_else(|| format!("The files call is missing {name}."))
}

fn path_of(args: &Value, name: &str) -> Result<PathBuf, String> {
    text_of(args, name).map(PathBuf::from)
}

fn answered<T: Serialize>(answer: Result<T, String>) -> Result<Value, String> {
    serde_json::to_value(answer?).map_err(|error| error.to_string())
}

fn answer_of(command: &str, args: &Value) -> Result<Value, String> {
    match command {
        "read_file" => answered(read_file(&path_of(args, "path")?)),
        "read_file_bytes" => answered(read_file_bytes(&path_of(args, "path")?)),
        "open_in_system_app" => answered(open_in_system_app(&path_of(args, "path")?)),
        "read_folder" => answered(read_folder(&path_of(args, "path")?)),
        "file_info" => answered(file_info(&path_of(args, "path")?)),
        "locate_file" => answered(locate_file(&path_of(args, "path")?, text_of(args, "identity")?)),
        "write_file" => answered(write_file(&path_of(args, "path")?, text_of(args, "content")?)),
        "append_file" => answered(append_file(&path_of(args, "path")?, text_of(args, "content")?)),
        "make_folder" => answered(make_folder(&path_of(args, "path")?)),
        "remove" => answered(remove(&path_of(args, "path")?)),
        "rename" => answered(rename(&path_of(args, "from")?, &path_of(args, "to")?)),
        "copy" => answered(copy(&path_of(args, "from")?, &path_of(args, "to")?)),
        other => Err(format!("The files plugin has no command {other}.")),
    }
}

fn picked_folder(app: &AppHandle<Wry>) -> Result<Value, String> {
    let picked = app.dialog().file().blocking_pick_folder();
    answered(Ok(picked.and_then(|folder| folder.into_path().ok()).map(|folder| folder.display().to_string())))
}

fn handle(invoke: Invoke<Wry>) -> bool {
    let Invoke { message, resolver, .. } = invoke;

    if let Err(refused) = refuse_foreign_caller(message.webview().label()) {
        resolver.reject(refused);
        return true;
    }

    if message.command() == PICK_FOLDER {
        let app = message.webview().app_handle().clone();
        std::thread::spawn(move || resolver.respond(picked_folder(&app).map_err(InvokeError::from)));
        return true;
    }

    let command = message.command().to_owned();
    let args = match message.payload() {
        InvokeBody::Json(args) => args.clone(),
        InvokeBody::Raw(_) => Value::Null,
    };
    std::thread::spawn(move || resolver.respond(answer_of(&command, &args).map_err(InvokeError::from)));
    true
}

pub fn init() -> TauriPlugin<Wry> {
    Builder::new(PLUGIN_NAME).invoke_handler(handle).build()
}
