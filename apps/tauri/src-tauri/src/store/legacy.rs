use super::place::{self, APP_FOLDER};
use super::refusal::Refusal;
use super::retirement;
use super::workspaces::{self, WORKSPACE_FILE};
use super::{Fields, Store, NO_WORKSPACE_ID};
use serde_json::{Map, Value};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

const LEGACY_WORKSPACES: &str = "workspaces";
const LEGACY_APP_DATA: &str = "app-data";
const APP_DATA: &str = "app-data";
const CHATS_FILE: &str = "chats.json";
const CHAT_SESSIONS_FILE: &str = "chat/sessions.json";
const LEGACY_ROOT: &str = "legacy";
const MOVED_ROOT: &str = "moved";

pub fn move_legacy_workspaces(store: &Store) {
    let Ok(entries) = fs::read_dir(store.global_folder().join(LEGACY_WORKSPACES)) else {
        return;
    };

    for entry in entries.flatten() {
        let from = entry.path();
        match move_workspace(store, &from) {
            Ok(said) => log::info!("[ink-store] legacy workspace {}: {said}", from.display()),
            Err(refusal) => log::error!("[ink-store] legacy workspace {} not moved: {} {:?}", from.display(), refusal.code(), refusal.to_json()),
        }
    }
}

fn move_workspace(store: &Store, from: &Path) -> Result<String, Refusal> {
    let Some(id) = from.file_name().and_then(|name| name.to_str()).map(str::to_owned) else {
        return Ok("skipped: no folder name".to_owned());
    };
    if id == NO_WORKSPACE_ID {
        return Ok("skipped: the no-workspace folder".to_owned());
    }
    if retirement::is_retired(store, &id) {
        return Ok("skipped: retired".to_owned());
    }
    if workspaces::home_of(store, &id).is_ok() {
        return Ok("skipped: moved already".to_owned());
    }

    let Some(Value::Object(identity)) = store.read_doc(&place::place_in(from, LEGACY_ROOT, WORKSPACE_FILE)?)?.doc else {
        return Ok("skipped: no workspace.json".to_owned());
    };
    if identity.get("id").and_then(Value::as_str) != Some(id.as_str()) {
        return Ok("skipped: its workspace.json names another id".to_owned());
    }

    let Some(home) = home_for(store, &id, identity.get("folder").and_then(Value::as_str)) else {
        return Ok("skipped: no folder to move into".to_owned());
    };
    let data = home.join(APP_FOLDER);
    refuse_other_workspace(store, &data, &id)?;
    let copied = copy_missing(from, &data)? + copy_missing(&store.global_folder().join(LEGACY_APP_DATA).join(&id), &data.join(APP_DATA))?;
    merge_doc(store, from, &data, CHATS_FILE, with_legacy_chats)?;
    merge_doc(store, from, &data, CHAT_SESSIONS_FILE, with_legacy_sessions)?;
    workspaces::register_moved(store, &id, &home)?;
    Ok(format!("unregistered → {} ({copied} files copied, chats merged)", home.display()))
}

fn home_for(store: &Store, id: &str, folder: Option<&str>) -> Option<PathBuf> {
    if let Some(found) = folder.map(PathBuf::from).filter(|path| path.is_dir()) {
        return found.canonicalize().ok();
    }
    if id != workspaces::first_workspace_id() {
        return None;
    }

    let home = workspaces::first_workspace_home(store);
    fs::create_dir_all(&home).ok()?;
    home.canonicalize().ok()
}

fn refuse_other_workspace(store: &Store, data: &Path, id: &str) -> Result<(), Refusal> {
    let place = place::place_in(data, MOVED_ROOT, WORKSPACE_FILE)?;
    if !place.file.is_file() {
        return Ok(());
    }

    let kept = store.read_doc(&place)?.doc;
    if kept.as_ref().and_then(|doc| doc.get("id")).and_then(Value::as_str) == Some(id) {
        return Ok(());
    }

    Err(Refusal::BadPath {
        detail: format!("{} holds another workspace", data.display()),
    })
}

fn copy_missing(from: &Path, to: &Path) -> Result<usize, Refusal> {
    if !from.is_dir() {
        return Ok(0);
    }

    fs::create_dir_all(to)?;
    let mut copied = 0;
    for entry in fs::read_dir(from)?.flatten() {
        let kind = entry.file_type()?;
        let target = to.join(entry.file_name());
        if kind.is_dir() {
            copied += copy_missing(&entry.path(), &target)?;
            continue;
        }
        if !kind.is_file() || target.exists() {
            continue;
        }

        fs::copy(entry.path(), &target)?;
        copied += 1;
    }
    Ok(copied)
}

fn merge_doc(store: &Store, from: &Path, data: &Path, file: &str, merged: fn(&Fields, &Fields) -> Fields) -> Result<(), Refusal> {
    let Some(Value::Object(legacy)) = store.read_doc(&place::place_in(from, LEGACY_ROOT, file)?)?.doc else {
        return Ok(());
    };

    store.update_doc(&place::place_in(data, MOVED_ROOT, file)?, &format!("merge the legacy {file}"), |current| {
        Ok(current.map_or_else(|| legacy.clone(), |kept| merged(&legacy, kept)))
    })?;
    Ok(())
}

fn with_legacy_chats(legacy: &Fields, kept: &Fields) -> Fields {
    let kept_chats = kept.get("chats").and_then(Value::as_array).cloned().unwrap_or_default();
    let known: HashSet<String> = kept_chats.iter().filter_map(|chat| chat.get("id").and_then(Value::as_str)).map(str::to_owned).collect();
    let added = legacy
        .get("chats")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|chat| chat.get("id").and_then(Value::as_str).is_some_and(|id| !known.contains(id)));
    let mut fields = kept.clone();
    fields.insert("chats".to_owned(), Value::Array(kept_chats.into_iter().chain(added).collect()));
    fields
}

fn with_legacy_sessions(legacy: &Fields, kept: &Fields) -> Fields {
    let mut sessions: Map<String, Value> = legacy.get("sessions").and_then(Value::as_object).cloned().unwrap_or_default();
    sessions.extend(kept.get("sessions").and_then(Value::as_object).cloned().unwrap_or_default());
    let mut fields = kept.clone();
    fields.insert("sessions".to_owned(), Value::Object(sessions));
    fields
}
