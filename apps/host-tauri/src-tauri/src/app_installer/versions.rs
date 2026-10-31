use super::paths::{checked_app_id, is_plain_folder, refuse_symlink, version_key};
use crate::store::atomic::write_atomically;
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;
use std::fs;
use std::io::ErrorKind;
use std::path::Path;

pub const STORE_FILE: &str = "store.json";

pub type AppRows = BTreeMap<String, AppVersions>;

pub struct AppVersions {
    pub current: Option<String>,
    pub previous: Option<String>,
    pub failed: Vec<String>,
}

impl Clone for AppVersions {
    fn clone(&self) -> Self {
        Self {
            current: self.current.clone(),
            previous: self.previous.clone(),
            failed: self.failed.clone(),
        }
    }
}

impl Default for AppVersions {
    fn default() -> Self {
        Self {
            current: None,
            previous: None,
            failed: Vec::new(),
        }
    }
}

impl AppVersions {
    pub fn with_first_install(&self, version: &str) -> Self {
        if self.current.is_some() || self.has_failed(version) {
            return self.clone();
        }

        Self {
            current: Some(version.to_owned()),
            ..self.clone()
        }
    }

    pub fn switched_to(&self, version: &str) -> Result<Self, String> {
        if self.has_failed(version) {
            return Err(format!("{version} failed before and cannot be made current"));
        }

        if self.current.as_deref() == Some(version) {
            return Ok(self.clone());
        }

        Ok(Self {
            current: Some(version.to_owned()),
            previous: self.current.clone(),
            failed: self.failed.clone(),
        })
    }

    pub fn failing(&self, version: &str) -> Self {
        let mut failed = self.failed.clone();
        if !self.has_failed(version) {
            failed.push(version.to_owned());
        }

        let was_current = self.current.as_deref() == Some(version);
        let previous = self.previous.clone().filter(|previous| previous != version);
        if was_current {
            return Self {
                current: previous,
                previous: None,
                failed,
            };
        }

        Self {
            current: self.current.clone(),
            previous,
            failed,
        }
    }

    pub fn retried(&self, version: &str) -> Self {
        Self {
            current: self.current.clone().or_else(|| Some(version.to_owned())),
            previous: self.previous.clone(),
            failed: self.failed.iter().filter(|failed| *failed != version).cloned().collect(),
        }
    }

    pub fn to_json(&self, versions: &[String]) -> Value {
        json!({
            "current": self.current,
            "previous": self.previous,
            "failed": self.failed,
            "versions": versions,
        })
    }

    fn has_failed(&self, version: &str) -> bool {
        self.failed.iter().any(|failed| failed == version)
    }

    fn to_store_json(&self) -> Value {
        json!({
            "current": self.current,
            "previous": self.previous,
            "failed": self.failed,
        })
    }

    fn of_store_json(id: &str, row: &Value) -> Result<Self, String> {
        let refused = || format!("{STORE_FILE} is corrupt: the row of {id} is not {{ current, previous, failed }}");
        let optional_text = |name: &str| match row.get(name) {
            None | Some(Value::Null) => Ok(None),
            Some(Value::String(text)) => Ok(Some(text.clone())),
            Some(_) => Err(refused()),
        };
        let failed = match row.get("failed") {
            None => Vec::new(),
            Some(Value::Array(items)) => {
                items.iter().map(|item| item.as_str().map(str::to_owned).ok_or_else(refused)).collect::<Result<_, _>>()?
            }
            Some(_) => return Err(refused()),
        };
        Ok(Self {
            current: optional_text("current")?,
            previous: optional_text("previous")?,
            failed,
        })
    }
}

pub fn read_rows(apps: &Path) -> Result<AppRows, String> {
    let file = apps.join(STORE_FILE);
    refuse_symlink(&file)?;
    let text = match fs::read_to_string(&file) {
        Ok(text) => text,
        Err(failure) if failure.kind() == ErrorKind::NotFound => return Ok(AppRows::new()),
        Err(failure) => return Err(format!("{STORE_FILE} cannot be read: {failure}")),
    };
    let doc: Value = serde_json::from_str(&text).map_err(|failure| format!("{STORE_FILE} is corrupt: {failure}"))?;
    let rows = doc
        .get("apps")
        .and_then(Value::as_object)
        .ok_or_else(|| format!("{STORE_FILE} is corrupt: it has no apps object"))?;
    rows.iter().map(|(id, row)| Ok((id.clone(), AppVersions::of_store_json(id, row)?))).collect()
}

pub fn write_rows(apps: &Path, rows: &AppRows) -> Result<(), String> {
    let file = apps.join(STORE_FILE);
    refuse_symlink(&file)?;
    let apps_json: Map<String, Value> = rows.iter().map(|(id, row)| (id.clone(), row.to_store_json())).collect();
    let text = serde_json::to_string_pretty(&json!({ "apps": apps_json })).map_err(|failure| failure.to_string())?;
    write_atomically(&file, text.as_bytes()).map_err(|failure| format!("{STORE_FILE} was not written: {failure}"))
}

pub fn installed_versions(apps: &Path, id: &str) -> Vec<String> {
    let mut versions: Vec<String> =
        visible_folders(&apps.join(id)).into_iter().filter(|name| version_key(name).is_some()).collect();
    versions.sort_by_key(|version| version_key(version));
    versions
}

pub fn installed_ids(apps: &Path) -> Vec<String> {
    visible_folders(apps).into_iter().filter(|name| checked_app_id(name).is_ok()).collect()
}

pub fn is_installed(apps: &Path, id: &str, version: &str) -> bool {
    is_plain_folder(&apps.join(id)) && is_plain_folder(&apps.join(id).join(version))
}

fn visible_folders(folder: &Path) -> Vec<String> {
    let Ok(entries) = fs::read_dir(folder) else {
        return Vec::new();
    };
    entries
        .flatten()
        .filter(|entry| is_plain_folder(&entry.path()))
        .filter_map(|entry| entry.file_name().to_str().map(str::to_owned))
        .filter(|name| !name.starts_with('.'))
        .collect()
}
