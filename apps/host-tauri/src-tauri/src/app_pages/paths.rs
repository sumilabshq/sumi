use crate::path_guard::{joined_without_symlinks, relative_parts};
use std::fs;
use std::path::{Path, PathBuf};

const FORBIDDEN_IN_PATH: [char; 2] = ['\\', '\0'];

pub fn checked_app_id(id: &str) -> Result<&str, String> {
    let mut chars = id.chars();
    let starts_with_letter = chars.next().is_some_and(|first| first.is_ascii_lowercase());
    let rest_allowed = chars.all(|char| char.is_ascii_lowercase() || char.is_ascii_digit() || char == '-');
    if starts_with_letter && rest_allowed {
        return Ok(id);
    }

    Err(format!("{id:?} is not an app id: lowercase letters, digits and dashes, starting with a letter"))
}

pub fn path_in(base: &Path, relative: &str) -> Result<PathBuf, String> {
    let parts = relative_parts(relative, &FORBIDDEN_IN_PATH).ok_or_else(|| format!("{relative:?} is not a path inside the build"))?;
    joined_without_symlinks(base, &parts).map_err(|link| format!("{} is a symlink", link.display()))
}

pub fn is_plain_file(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|meta| meta.file_type().is_file())
}

pub fn is_plain_folder(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|meta| meta.file_type().is_dir())
}
