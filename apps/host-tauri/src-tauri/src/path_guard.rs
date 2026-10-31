use std::fs;
use std::path::{Path, PathBuf};

pub fn is_symlink(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|meta| meta.file_type().is_symlink())
}

pub fn relative_parts<'a>(relative: &'a str, forbidden: &[char]) -> Option<Vec<&'a str>> {
    if relative.is_empty() || relative.starts_with('/') || relative.contains(forbidden) {
        return None;
    }

    let parts: Vec<&str> = relative.split('/').collect();
    if parts.iter().any(|part| part.is_empty() || *part == "." || *part == "..") {
        return None;
    }

    Some(parts)
}

pub fn joined_without_symlinks(base: &Path, parts: &[&str]) -> Result<PathBuf, PathBuf> {
    let mut path = base.to_path_buf();
    for part in parts {
        path.push(part);
        if is_symlink(&path) {
            return Err(path);
        }
    }

    Ok(path)
}
