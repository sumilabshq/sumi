use super::attachments::private_folder;
use super::turns::Turns;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, PoisonError};

pub struct Assistant {
    pub attachments: PathBuf,
    pub turns: Turns,
    picked_folders: Mutex<Vec<PathBuf>>,
    dropped_files: Mutex<Vec<PathBuf>>,
}

impl Assistant {
    pub fn new(attachments: PathBuf) -> Self {
        Assistant { attachments, turns: Turns::new(), picked_folders: Mutex::new(Vec::new()), dropped_files: Mutex::new(Vec::new()) }
    }

    pub fn remember_picked(&self, folder: PathBuf) {
        let mut picked = self.picked_folders.lock().unwrap_or_else(PoisonError::into_inner);
        if !picked.contains(&folder) {
            eprintln!("[ink-assistant] picked folders gain {}", folder.display());
            picked.push(folder);
        }
    }

    pub fn was_picked(&self, folder: &Path) -> bool {
        self.picked_folders.lock().unwrap_or_else(PoisonError::into_inner).iter().any(|picked| picked == folder)
    }

    pub fn replace_dropped(&self, files: Vec<PathBuf>) {
        let mut dropped = self.dropped_files.lock().unwrap_or_else(PoisonError::into_inner);
        let was = std::mem::replace(&mut *dropped, files);
        eprintln!("[ink-assistant] dropped files {} → {}", was.len(), dropped.len());
    }

    pub fn was_dropped(&self, file: &Path) -> bool {
        self.dropped_files.lock().unwrap_or_else(PoisonError::into_inner).iter().any(|dropped| dropped == file)
    }

    pub fn with_private_attachments() -> Self {
        Assistant::new(private_folder())
    }
}
