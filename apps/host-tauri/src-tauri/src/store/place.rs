use super::refusal::Refusal;
use std::fs;
use std::path::{Path, PathBuf};

pub const APP_FOLDER: &str = ".ink";

const GLOBAL_ROOT: &str = "global";
const WORKSPACE_ROOT_PREFIX: &str = "workspace:";
const FOLDER_ROOT_PREFIX: &str = "folder:";
const FORBIDDEN_IN_PATH: [char; 3] = ['\\', ':', '\0'];

pub enum RootKind {
    Global,
    Workspace(String),
    Folder(String),
}

impl RootKind {
    pub fn parse(root: &str) -> Result<Self, Refusal> {
        if root == GLOBAL_ROOT {
            return Ok(Self::Global);
        }

        if let Some(id) = root.strip_prefix(WORKSPACE_ROOT_PREFIX) {
            return Ok(Self::Workspace(checked_id(root, id)?));
        }

        let id = root.strip_prefix(FOLDER_ROOT_PREFIX).unwrap_or_default();
        Ok(Self::Folder(checked_id(root, id)?))
    }

    pub fn label(&self) -> String {
        match self {
            Self::Global => GLOBAL_ROOT.to_owned(),
            Self::Workspace(id) => format!("{WORKSPACE_ROOT_PREFIX}{id}"),
            Self::Folder(id) => format!("{FOLDER_ROOT_PREFIX}{id}"),
        }
    }
}

pub struct Place {
    pub label: String,
    pub file: PathBuf,
}

pub fn place_in(app_folder: &Path, root_label: &str, relative: &str) -> Result<Place, Refusal> {
    let mut file = app_folder.to_path_buf();
    refuse_symlink(&file)?;
    for part in checked_parts(relative)? {
        file.push(part);
        refuse_symlink(&file)?;
    }

    Ok(Place {
        label: format!("{root_label}:{relative}"),
        file,
    })
}

pub fn require_extension(relative: &str, extension: &str) -> Result<(), Refusal> {
    if relative.ends_with(extension) {
        return Ok(());
    }

    Err(Refusal::BadPath {
        detail: format!("{relative} is not a {extension} file"),
    })
}

pub fn refuse_symlink(path: &Path) -> Result<(), Refusal> {
    let is_symlink = fs::symlink_metadata(path).is_ok_and(|meta| meta.file_type().is_symlink());
    if !is_symlink {
        return Ok(());
    }

    Err(Refusal::Symlink {
        detail: path.display().to_string(),
    })
}

pub fn checked_id(root: &str, id: &str) -> Result<String, Refusal> {
    if uuid::Uuid::parse_str(id).is_ok() {
        return Ok(id.to_owned());
    }

    Err(Refusal::BadRoot {
        detail: root.to_owned(),
    })
}

fn checked_parts(relative: &str) -> Result<Vec<&str>, Refusal> {
    let refused = || Refusal::BadPath {
        detail: relative.to_owned(),
    };
    let is_unsafe = relative.contains(FORBIDDEN_IN_PATH) || relative.chars().any(char::is_uppercase);
    if relative.is_empty() || relative.starts_with('/') || is_unsafe {
        return Err(refused());
    }

    let parts: Vec<&str> = relative.split('/').collect();
    if parts.iter().any(|part| part.is_empty() || *part == "." || *part == "..") {
        return Err(refused());
    }

    Ok(parts)
}
