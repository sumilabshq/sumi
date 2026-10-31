use crate::path_guard::{is_symlink, joined_without_symlinks, relative_parts};
use std::fs;
use std::path::{Path, PathBuf};

const FORBIDDEN_IN_PATH: [char; 2] = ['\\', '\0'];
const BUILT_IN_APPS: [&str; 5] = ["canvas", "browser", "terminal", "chat", "app"];

pub fn checked_app_id(id: &str) -> Result<&str, String> {
    let mut chars = id.chars();
    let starts_with_letter = chars.next().is_some_and(|first| first.is_ascii_lowercase());
    let rest_allowed = chars.all(|char| char.is_ascii_lowercase() || char.is_ascii_digit() || char == '-');
    if starts_with_letter && rest_allowed {
        return Ok(id);
    }

    Err(format!("{id:?} is not an app id: lowercase letters, digits and dashes, starting with a letter"))
}

pub fn refuse_built_in(id: &str) -> Result<(), String> {
    if !BUILT_IN_APPS.contains(&id) {
        return Ok(());
    }

    Err(format!("{id} is a built-in app name"))
}

pub fn checked_version(version: &str) -> Result<&str, String> {
    if version_key(version).is_some() {
        return Ok(version);
    }

    Err(format!("{version:?} is not a version: major.minor.patch"))
}

pub fn version_key(version: &str) -> Option<(u64, u64, u64)> {
    let mut numbers = version.split('.').map(|part| {
        if part.is_empty() || !part.chars().all(|char| char.is_ascii_digit()) {
            return None;
        }

        part.parse::<u64>().ok()
    });
    let key = (numbers.next()??, numbers.next()??, numbers.next()??);
    if numbers.next().is_some() {
        return None;
    }

    Some(key)
}

pub fn checked_parts(relative: &str) -> Result<Vec<&str>, String> {
    relative_parts(relative, &FORBIDDEN_IN_PATH).ok_or_else(|| format!("{relative:?} is not a path inside the release"))
}

pub fn path_in(base: &Path, relative: &str) -> Result<PathBuf, String> {
    joined_without_symlinks(base, &checked_parts(relative)?).map_err(|link| format!("{} is a symlink", link.display()))
}

pub fn refuse_symlink(path: &Path) -> Result<(), String> {
    if !is_symlink(path) {
        return Ok(());
    }

    Err(format!("{} is a symlink", path.display()))
}

pub fn is_plain_file(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|meta| meta.file_type().is_file())
}

pub fn is_plain_folder(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|meta| meta.file_type().is_dir())
}

pub fn refuse_relative(folder: &Path) -> Result<(), String> {
    if folder.is_absolute() {
        return Ok(());
    }

    Err(format!("{} is not an absolute path", folder.display()))
}
