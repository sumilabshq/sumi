use super::refusal::Refusal;
use super::{now_ms, Fields, Store};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};

pub const WORKSPACES_FILE: &str = "workspaces.json";
pub const WORKSPACE_FILE: &str = "workspace.json";

const FIRST_WORKSPACE_NAME: &str = "Default";
const FIRST_WORKSPACE_SEED: &[u8] = b"ink-first-workspace";
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
}

struct Identity {
    id: String,
    name: String,
    folder: Option<String>,
    recent_folders: Vec<String>,
}

pub fn open_first(store: &Store) -> Result<WorkspaceEntry, Refusal> {
    let id = uuid::Uuid::new_v5(&uuid::Uuid::NAMESPACE_OID, FIRST_WORKSPACE_SEED);
    create(store, &id.to_string(), FIRST_WORKSPACE_NAME)
}

pub fn create_new(store: &Store, name: &str) -> Result<WorkspaceEntry, Refusal> {
    create(store, &uuid::Uuid::new_v4().to_string(), name)
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
        None => store.workspace_folder(id)?,
    };
    Ok(working.canonicalize()?)
}

fn create(store: &Store, id: &str, name: &str) -> Result<WorkspaceEntry, Refusal> {
    let trimmed = checked_name(name)?;
    let place = store.workspace_place(id, WORKSPACE_FILE)?;
    let written = store.update_doc(&place, "open workspace identity", |current| {
        let kept = current.filter(|fields| identity_in(&Value::Object((*fields).clone())).is_some());
        Ok(kept.cloned().unwrap_or_else(|| fresh_identity(id, trimmed)))
    })?;
    entry_of_written(store, id, written)
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

fn entry_of_written(store: &Store, id: &str, written: Fields) -> Result<WorkspaceEntry, Refusal> {
    let identity = identity_in(&Value::Object(written)).ok_or_else(|| Refusal::NoWorkspace { detail: id.to_owned() })?;
    Ok(entry_of(identity, remember(store, id)?))
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
    let opened_at = now_ms();
    store.update_doc(&store.global_place(WORKSPACES_FILE)?, "open workspace", |current| {
        let mut opened: Vec<OpenedWorkspace> = opened_in(current).into_iter().filter(|kept| kept.id != id).collect();
        opened.insert(
            0,
            OpenedWorkspace {
                id: id.to_owned(),
                last_opened_at: opened_at,
            },
        );
        let rows: Vec<Value> = opened
            .iter()
            .map(|row| json!({ "id": row.id, "lastOpenedAt": row.last_opened_at }))
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
    let (Some(id), Some(last_opened_at)) = (id, last_opened_at) else {
        eprintln!("[ink-store] global:{WORKSPACES_FILE} skipped an unreadable row {row}");
        return None;
    };
    Some(OpenedWorkspace {
        id: id.to_owned(),
        last_opened_at,
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
