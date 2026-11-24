use super::place::{home_app_folder, APP_FOLDER};
use super::refusal::Refusal;
use super::workspaces::{self, opened_in, WorkspaceEntry, WORKSPACES_FILE};
use super::{Fields, Store};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};

const RETIRED_IDS: &str = "retiredIds";
const LAST_OPENED_ID: &str = "lastOpenedId";
const CONVERSION_APP_FOLDER: &str = ".sumi-test";
const CONVERSION_HOME_FOLDER: &str = ".sumi-test-workspace";
const DOC_V: u64 = 1;

pub fn retired_ids_in(registry: Option<&Fields>) -> Vec<String> {
    let ids = registry.and_then(|fields| fields.get(RETIRED_IDS)).and_then(Value::as_array).cloned().unwrap_or_default();
    ids.iter().filter_map(Value::as_str).map(str::to_owned).collect()
}

pub fn refuse_retired_in(registry: Option<&Fields>, id: &str) -> Result<(), Refusal> {
    if !retired_ids_in(registry).iter().any(|retired| retired == id) {
        return Ok(());
    }

    Err(Refusal::Retired { detail: id.to_owned() })
}

pub fn is_retired(store: &Store, id: &str) -> bool {
    let Ok(place) = store.global_place(WORKSPACES_FILE) else {
        return false;
    };
    let Ok(read) = store.read_doc(&place) else {
        return false;
    };
    refuse_retired_in(read.doc.as_ref().and_then(Value::as_object), id).is_err()
}

pub fn open_kept_root(store: &Store) -> Result<WorkspaceEntry, Refusal> {
    let registry = store.read_doc(&store.global_place(WORKSPACES_FILE)?)?.doc;
    let id = registry
        .as_ref()
        .and_then(|doc| doc.get(LAST_OPENED_ID))
        .and_then(Value::as_str)
        .ok_or_else(|| Refusal::NoWorkspace {
            detail: "no kept root is registered".to_owned(),
        })?;
    workspaces::mark_opened(store, id)
}

pub fn retire_other_workspaces(store: &Store, keep_id: &str) -> Result<Vec<String>, Refusal> {
    let mut retired_now: Vec<String> = Vec::new();
    let mut was = String::new();
    store.update_doc(&store.global_place(WORKSPACES_FILE)?, "retire the other workspaces", |current| {
        refuse_retired_in(current, keep_id)?;
        let all = opened_in(current);
        let kept = all.iter().find(|row| row.id == keep_id).ok_or_else(|| Refusal::NoWorkspace { detail: keep_id.to_owned() })?;
        refuse_unsafe_root(Path::new(&kept.home))?;
        retired_now = all.iter().filter(|row| row.id != keep_id).map(|row| row.id.clone()).collect();
        was = describe(current);
        let retired: Vec<String> = retired_ids_in(current).into_iter().chain(retired_now.iter().cloned()).fold(Vec::new(), |mut ids, id| {
            if !ids.contains(&id) {
                ids.push(id);
            }
            ids
        });
        let mut fields = current.cloned().unwrap_or_default();
        fields.insert("v".to_owned(), Value::from(DOC_V));
        fields.insert("workspaces".to_owned(), json!([{ "id": kept.id, "lastOpenedAt": kept.last_opened_at, "home": kept.home }]));
        fields.insert(RETIRED_IDS.to_owned(), json!(retired));
        fields.insert(LAST_OPENED_ID.to_owned(), Value::from(keep_id));
        Ok(fields)
    })?;
    log::info!("[ink-store] global:{WORKSPACES_FILE} {was} → only {keep_id} registered, retiredIds +{retired_now:?}, lastOpenedId {keep_id}");
    Ok(retired_now)
}

fn describe(current: Option<&Fields>) -> String {
    let ids: Vec<String> = opened_in(current).into_iter().map(|row| row.id).collect();
    let last = current.and_then(|fields| fields.get(LAST_OPENED_ID)).and_then(Value::as_str).unwrap_or("none");
    format!("workspaces {ids:?} lastOpenedId {last}")
}

fn refuse_unsafe_root(home: &Path) -> Result<(), Refusal> {
    if home.is_dir() && home.join(APP_FOLDER).is_dir() {
        return Ok(());
    }

    Err(Refusal::FolderNotFound {
        detail: format!("{} holds no {APP_FOLDER} to keep as the root", home.display()),
    })
}

pub fn conversion_refusal(store: &Store, id: &str) -> Option<String> {
    let registered = workspaces::registered_home_of(store, id);
    refusal_of_conversion_root(&home_app_folder(), registered.as_deref(), store.home())
}

pub fn refusal_of_conversion_root(app_folder: &str, registry_home: Option<&Path>, user_home: &Path) -> Option<String> {
    if app_folder != CONVERSION_APP_FOLDER {
        return Some(format!("SUMI_APP_FOLDER is {app_folder:?}, the conversion runs only on {CONVERSION_APP_FOLDER:?}"));
    }

    let expected: PathBuf = user_home.join(CONVERSION_HOME_FOLDER);
    match registry_home {
        Some(home) if home == expected => None,
        Some(home) => Some(format!("the registry home is {}, the conversion runs only on {}", home.display(), expected.display())),
        None => Some("the workspace is not in the registry".to_owned()),
    }
}
