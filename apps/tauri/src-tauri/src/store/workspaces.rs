use super::place::{self, APP_FOLDER};
use super::refusal::Refusal;
use super::{now_ms, Fields, Store};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};

pub const WORKSPACES_FILE: &str = "workspaces.json";
pub const WORKSPACE_FILE: &str = "workspace.json";

const FIRST_WORKSPACE_NAME: &str = "Default";
const FIRST_WORKSPACE_SEED: &[u8] = b"ink-first-workspace";
const FIRST_WORKSPACE_FOLDER: &str = "Sumi";
const KEEP_OUT_OF_GIT: &str = ".gitignore";
const DOC_V: u64 = 1;
const MOST_RECENT_FOLDERS: usize = 8;

pub struct WorkspaceEntry {
    pub id: String,
    pub name: String,
    pub folder: Option<String>,
    pub folder_found: bool,
    pub last_opened_at: u64,
    pub recent_folders: Vec<String>,
}

impl WorkspaceEntry {
    pub fn to_json(&self) -> Value {
        json!({
            "id": self.id,
            "name": self.name,
            "folder": self.folder,
            "folderFound": self.folder_found,
            "lastOpenedAt": self.last_opened_at,
            "recentFolders": self.recent_folders,
        })
    }
}

struct OpenedWorkspace {
    id: String,
    last_opened_at: u64,
    home: String,
}

struct Identity {
    id: String,
    name: String,
    folder: Option<String>,
    recent_folders: Vec<String>,
}

pub fn open_first(store: &Store) -> Result<WorkspaceEntry, Refusal> {
    let id = first_workspace_id();
    if let Ok(home) = home_of(store, &id) {
        return open_folder(store, &home);
    }

    let home = first_workspace_home(store);
    fs::create_dir_all(&home)?;
    create(store, &id, FIRST_WORKSPACE_NAME, &home.canonicalize()?)
}

pub fn first_workspace_id() -> String {
    uuid::Uuid::new_v5(&uuid::Uuid::NAMESPACE_OID, FIRST_WORKSPACE_SEED).to_string()
}

pub fn first_workspace_home(store: &Store) -> PathBuf {
    store.home().join(FIRST_WORKSPACE_FOLDER)
}

pub fn register_moved(store: &Store, id: &str, home: &Path) -> Result<(), Refusal> {
    keep_out_of_git(home)?;
    store.update_doc(&store.global_place(WORKSPACES_FILE)?, "register a workspace moved into its folder", |current| {
        let rows = current.and_then(|fields| fields.get("workspaces")).and_then(Value::as_array).cloned().unwrap_or_default();
        let last_opened_at = rows
            .iter()
            .find(|row| row.get("id").and_then(Value::as_str) == Some(id))
            .and_then(|row| row.get("lastOpenedAt"))
            .and_then(Value::as_u64)
            .unwrap_or(0);
        let mut kept: Vec<Value> = rows.into_iter().filter(|row| row.get("id").and_then(Value::as_str) != Some(id)).collect();
        kept.push(json!({ "id": id, "lastOpenedAt": last_opened_at, "home": home.to_string_lossy() }));
        let mut fields = current.cloned().unwrap_or_default();
        fields.insert("v".to_owned(), Value::from(DOC_V));
        fields.insert("workspaces".to_owned(), Value::Array(kept));
        Ok(fields)
    })?;
    Ok(())
}

pub fn open_folder(store: &Store, folder: &Path) -> Result<WorkspaceEntry, Refusal> {
    let home = checked_home(store, folder)?;
    let Some(kept) = kept_identity_in(store, &home)? else {
        return create(store, &uuid::Uuid::new_v4().to_string(), &name_of_folder(&home), &home);
    };

    refuse_open_elsewhere(store, &kept.id, &home)?;
    let opened_at = register(store, &kept.id, &home)?;
    keep_out_of_git(&home)?;
    Ok(entry_of(kept, opened_at))
}

pub fn home_of(store: &Store, id: &str) -> Result<PathBuf, Refusal> {
    let registry = store.read_doc(&store.global_place(WORKSPACES_FILE)?)?.doc;
    let home = opened_in(registry.as_ref().and_then(Value::as_object))
        .into_iter()
        .find(|row| row.id == id)
        .map(|row| PathBuf::from(row.home))
        .ok_or_else(|| Refusal::NoWorkspace { detail: id.to_owned() })?;
    if home.is_dir() {
        return Ok(home);
    }

    Err(Refusal::FolderNotFound {
        detail: home.display().to_string(),
    })
}

fn checked_home(store: &Store, folder: &Path) -> Result<PathBuf, Refusal> {
    let home = folder.canonicalize().map_err(|_| Refusal::FolderNotFound {
        detail: folder.display().to_string(),
    })?;
    let user_home = store.home().canonicalize().unwrap_or_else(|_| store.home().to_path_buf());
    let is_refused = !home.is_dir() || home == user_home || home.starts_with(store.global_folder()) || home.parent().is_none();
    if !is_refused {
        return Ok(home);
    }

    Err(Refusal::BadPath {
        detail: format!("{} cannot hold a workspace", home.display()),
    })
}

fn kept_identity_in(store: &Store, home: &Path) -> Result<Option<Identity>, Refusal> {
    let place = place::place_in(&home.join(APP_FOLDER), "folder", WORKSPACE_FILE)?;
    if !place.file.is_file() {
        return Ok(None);
    }

    Ok(store.read_doc(&place)?.doc.as_ref().and_then(identity_in))
}

fn refuse_open_elsewhere(store: &Store, id: &str, home: &Path) -> Result<(), Refusal> {
    let Ok(registered) = home_of(store, id) else {
        return Ok(());
    };
    if registered == home {
        return Ok(());
    }

    Err(Refusal::BadPath {
        detail: format!("this workspace is already open from {}", registered.display()),
    })
}

fn name_of_folder(home: &Path) -> String {
    home.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| FIRST_WORKSPACE_NAME.to_owned())
}

fn keep_out_of_git(home: &Path) -> Result<(), Refusal> {
    let ignore = home.join(APP_FOLDER).join(KEEP_OUT_OF_GIT);
    if ignore.exists() {
        return Ok(());
    }

    fs::create_dir_all(home.join(APP_FOLDER))?;
    fs::write(ignore, "*\n")?;
    Ok(())
}

pub fn list(store: &Store) -> Result<Vec<WorkspaceEntry>, Refusal> {
    let registry = store.read_doc(&store.global_place(WORKSPACES_FILE)?)?.doc;
    let opened = opened_in(registry.as_ref().and_then(Value::as_object));
    Ok(opened
        .into_iter()
        .filter_map(|row| identity_of(store, &row.id).ok().map(|identity| entry_of(identity, row.last_opened_at)))
        .collect())
}

pub fn rename(store: &Store, id: &str, name: &str) -> Result<(), Refusal> {
    let trimmed = checked_name(name)?;
    store.update_doc(&store.workspace_place(id, WORKSPACE_FILE)?, "rename workspace", |current| {
        let mut fields = current.cloned().ok_or_else(|| Refusal::NoWorkspace { detail: id.to_owned() })?;
        fields.insert("name".to_owned(), Value::from(trimmed));
        Ok(fields)
    })?;
    Ok(())
}

pub fn attach_folder(store: &Store, id: &str, folder: &Path) -> Result<WorkspaceEntry, Refusal> {
    let path = folder.to_str().ok_or_else(|| Refusal::BadPath {
        detail: folder.display().to_string(),
    })?;
    let written = store.update_doc(&store.workspace_place(id, WORKSPACE_FILE)?, "attach folder", |current| {
        let fields = current.cloned().ok_or_else(|| Refusal::NoWorkspace { detail: id.to_owned() })?;
        Ok(with_folder(fields, path))
    })?;
    let identity = identity_in(&Value::Object(written)).ok_or_else(|| Refusal::NoWorkspace { detail: id.to_owned() })?;
    Ok(entry_of(identity, remember(store, id)?))
}

pub fn choose_folder(store: &Store, id: &str, path: &str) -> Result<WorkspaceEntry, Refusal> {
    let written = store.update_doc(&store.workspace_place(id, WORKSPACE_FILE)?, "choose a recent folder", |current| {
        let fields = current.cloned().ok_or_else(|| Refusal::NoWorkspace { detail: id.to_owned() })?;
        let is_recent = recent_in(&Value::Object(fields.clone())).iter().any(|recent| recent == path);
        if !is_recent || !Path::new(path).is_dir() {
            return Err(Refusal::BadPath {
                detail: format!("{path} is not a folder this workspace was given"),
            });
        }

        Ok(with_folder(fields, path))
    })?;
    let identity = identity_in(&Value::Object(written)).ok_or_else(|| Refusal::NoWorkspace { detail: id.to_owned() })?;
    Ok(entry_of(identity, remember(store, id)?))
}

fn with_folder(mut fields: Fields, path: &str) -> Fields {
    let mut recent: Vec<String> = recent_in(&Value::Object(fields.clone())).into_iter().filter(|kept| kept != path).collect();
    recent.insert(0, path.to_owned());
    recent.truncate(MOST_RECENT_FOLDERS);
    fields.insert("folder".to_owned(), Value::from(path));
    fields.insert("recentFolders".to_owned(), json!(recent));
    fields
}

fn recent_in(doc: &Value) -> Vec<String> {
    let rows = doc.get("recentFolders").and_then(Value::as_array).cloned().unwrap_or_default();
    rows.iter().filter_map(Value::as_str).map(str::to_owned).collect()
}

pub fn mark_opened(store: &Store, id: &str) -> Result<WorkspaceEntry, Refusal> {
    let identity = identity_of(store, id)?;
    Ok(entry_of(identity, remember(store, id)?))
}

pub fn folder_of(store: &Store, id: &str) -> Result<PathBuf, Refusal> {
    let folder = identity_of(store, id)?
        .folder
        .map(PathBuf::from)
        .ok_or_else(|| Refusal::NoFolder { detail: id.to_owned() })?;
    if folder.is_dir() {
        return Ok(folder);
    }

    Err(Refusal::FolderNotFound {
        detail: folder.display().to_string(),
    })
}

pub fn opened_working_folder(store: &Store) -> Result<PathBuf, Refusal> {
    let registry = store.read_doc(&store.global_place(WORKSPACES_FILE)?)?.doc;
    let id = registry
        .as_ref()
        .and_then(|doc| doc.get("lastOpenedId"))
        .and_then(Value::as_str)
        .ok_or_else(|| Refusal::NoWorkspace {
            detail: "no workspace is open".to_owned(),
        })?;
    let attached = identity_of(store, id)?.folder.map(PathBuf::from);
    let working = match attached.filter(|folder| folder.is_dir()) {
        Some(folder) => folder,
        None => home_of(store, id)?,
    };
    Ok(working.canonicalize()?)
}

fn create(store: &Store, id: &str, name: &str, home: &Path) -> Result<WorkspaceEntry, Refusal> {
    let trimmed = checked_name(name)?;
    let opened_at = register(store, id, home)?;
    keep_out_of_git(home)?;
    let place = store.workspace_place(id, WORKSPACE_FILE)?;
    let written = store.update_doc(&place, "open workspace identity", |current| {
        let kept = current.filter(|fields| identity_in(&Value::Object((*fields).clone())).is_some());
        Ok(kept.cloned().unwrap_or_else(|| with_folder(fresh_identity(id, trimmed), &home.to_string_lossy())))
    })?;
    let identity = identity_in(&Value::Object(written)).ok_or_else(|| Refusal::NoWorkspace { detail: id.to_owned() })?;
    Ok(entry_of(identity, opened_at))
}

fn checked_name(name: &str) -> Result<&str, Refusal> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(Refusal::BadDoc {
            detail: "a workspace needs a name".to_owned(),
        });
    }

    Ok(trimmed)
}

fn fresh_identity(id: &str, name: &str) -> Fields {
    let mut fields = Fields::new();
    fields.insert("v".to_owned(), Value::from(DOC_V));
    fields.insert("id".to_owned(), Value::from(id));
    fields.insert("name".to_owned(), Value::from(name));
    fields
}

fn identity_of(store: &Store, id: &str) -> Result<Identity, Refusal> {
    store
        .read_doc(&store.workspace_place(id, WORKSPACE_FILE)?)?
        .doc
        .as_ref()
        .and_then(identity_in)
        .ok_or_else(|| Refusal::NoWorkspace { detail: id.to_owned() })
}

fn remember(store: &Store, id: &str) -> Result<u64, Refusal> {
    opened_from(store, id, None)
}

fn register(store: &Store, id: &str, home: &Path) -> Result<u64, Refusal> {
    opened_from(store, id, Some(home))
}

fn opened_from(store: &Store, id: &str, home: Option<&Path>) -> Result<u64, Refusal> {
    let opened_at = now_ms();
    store.update_doc(&store.global_place(WORKSPACES_FILE)?, "open workspace", |current| {
        let all = opened_in(current);
        let kept_home = all.iter().find(|kept| kept.id == id).map(|kept| kept.home.clone());
        let home = home
            .map(|path| path.to_string_lossy().into_owned())
            .or(kept_home)
            .ok_or_else(|| Refusal::NoWorkspace { detail: id.to_owned() })?;
        let mut opened: Vec<OpenedWorkspace> = all.into_iter().filter(|kept| kept.id != id).collect();
        opened.insert(
            0,
            OpenedWorkspace {
                id: id.to_owned(),
                last_opened_at: opened_at,
                home,
            },
        );
        let rows: Vec<Value> = opened
            .iter()
            .map(|row| json!({ "id": row.id, "lastOpenedAt": row.last_opened_at, "home": row.home }))
            .collect();
        let mut fields = current.cloned().unwrap_or_default();
        fields.insert("v".to_owned(), Value::from(DOC_V));
        fields.insert("workspaces".to_owned(), Value::Array(rows));
        fields.insert("lastOpenedId".to_owned(), Value::from(id));
        Ok(fields)
    })?;
    Ok(opened_at)
}

fn opened_in(current: Option<&Fields>) -> Vec<OpenedWorkspace> {
    let rows = current
        .and_then(|fields| fields.get("workspaces"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    rows.iter().filter_map(opened_row).collect()
}

fn opened_row(row: &Value) -> Option<OpenedWorkspace> {
    let id = row.get("id").and_then(Value::as_str).filter(|id| uuid::Uuid::parse_str(id).is_ok());
    let last_opened_at = row.get("lastOpenedAt").and_then(Value::as_u64);
    let home = row.get("home").and_then(Value::as_str).filter(|home| !home.is_empty());
    let (Some(id), Some(last_opened_at), Some(home)) = (id, last_opened_at, home) else {
        log::warn!("[ink-store] global:{WORKSPACES_FILE} skipped an unreadable row {row}");
        return None;
    };
    Some(OpenedWorkspace {
        id: id.to_owned(),
        last_opened_at,
        home: home.to_owned(),
    })
}

fn identity_in(doc: &Value) -> Option<Identity> {
    let id = doc.get("id").and_then(Value::as_str).filter(|id| uuid::Uuid::parse_str(id).is_ok())?;
    let name = doc.get("name").and_then(Value::as_str).filter(|name| !name.is_empty())?;
    Some(Identity {
        id: id.to_owned(),
        name: name.to_owned(),
        folder: doc.get("folder").and_then(Value::as_str).map(str::to_owned),
        recent_folders: recent_in(doc),
    })
}

fn entry_of(identity: Identity, last_opened_at: u64) -> WorkspaceEntry {
    let folder_found = identity.folder.as_deref().is_some_and(|folder| Path::new(folder).is_dir());
    WorkspaceEntry {
        id: identity.id,
        name: identity.name,
        folder: identity.folder,
        folder_found,
        last_opened_at,
        recent_folders: identity.recent_folders,
    }
}
