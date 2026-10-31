use super::paths::{checked_app_id, is_plain_folder, refuse_symlink, version_key};
use super::decode::decode_bytes;
use crate::store::atomic::write_atomically;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::fs;
use std::io::ErrorKind;
use std::path::Path;

pub const STORE_FILE: &str = "store.json";

pub type AppRows = BTreeMap<String, AppVersions>;

#[derive(Serialize, Deserialize)]
struct Store {
    apps: AppRows,
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct AppVersions {
    pub current: Option<String>,
    pub previous: Option<String>,
    pub failed: Vec<String>,
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
}

pub fn read_rows(apps: &Path) -> Result<AppRows, String> {
    let file = apps.join(STORE_FILE);
    refuse_symlink(&file)?;
    let bytes = match fs::read(&file) {
        Ok(bytes) => bytes,
        Err(failure) if failure.kind() == ErrorKind::NotFound => return Ok(AppRows::new()),
        Err(failure) => return Err(format!("{STORE_FILE} cannot be read: {failure}")),
    };
    decode_bytes::<Store>(&bytes, STORE_FILE).map(|store| store.apps)
}

pub fn write_rows(apps: &Path, rows: AppRows) -> Result<(), String> {
    let file = apps.join(STORE_FILE);
    refuse_symlink(&file)?;
    let text = serde_json::to_string_pretty(&Store { apps: rows }).map_err(|failure| failure.to_string())?;
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
