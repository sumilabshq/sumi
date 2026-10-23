use std::path::{Component, Path, PathBuf};

pub const OUTSIDE_THE_FOLDER: &str = "The path is not a file directly inside the private attachments folder.";
pub const UNSAFE_NAME: &str = "The file name holds characters an attachment may not use.";

fn is_safe_name_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-'
}

pub fn is_safe_file_name(name: &str) -> bool {
    let is_dots_only = name.chars().all(|c| c == '.');
    !name.is_empty() && !is_dots_only && name.chars().all(is_safe_name_char)
}

fn is_plain(path: &Path) -> bool {
    path.is_absolute() && path.components().all(|part| !matches!(part, Component::ParentDir | Component::CurDir))
}

fn real_folder(folder: &Path) -> Option<PathBuf> {
    folder.canonicalize().ok()
}

pub fn attachment_file_in(folder: &Path, asked: &str) -> Result<PathBuf, String> {
    let path = Path::new(asked);
    let name = path.file_name().and_then(|name| name.to_str()).ok_or(OUTSIDE_THE_FOLDER)?;
    if !is_safe_file_name(name) {
        return Err(UNSAFE_NAME.into());
    }

    let parent = path.parent().filter(|_| is_plain(path)).ok_or(OUTSIDE_THE_FOLDER)?;
    let real = real_folder(folder).ok_or(OUTSIDE_THE_FOLDER)?;
    if real_folder(parent).as_ref() != Some(&real) {
        return Err(OUTSIDE_THE_FOLDER.into());
    }

    Ok(real.join(name))
}
