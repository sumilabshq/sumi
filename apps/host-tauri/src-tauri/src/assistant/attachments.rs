use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

const FOLDER_MODE: u32 = 0o700;
const FILE_MODE: u32 = 0o600;
const FOLDER_NAME: &str = "widgetarium-attachments";
const NOT_A_PRIVATE_FOLDER: &str = "the attachments folder is a link or a file, not a private folder";

pub fn private_folder_for(temp: &Path, uid: u32) -> PathBuf {
    temp.join(format!("{FOLDER_NAME}-{uid}"))
}

pub fn private_folder() -> PathBuf {
    let uid = unsafe { libc::getuid() };
    private_folder_for(&std::env::temp_dir(), uid)
}

pub fn ensure_private_folder(folder: &Path) -> io::Result<()> {
    fs::create_dir_all(folder)?;
    let held = fs::symlink_metadata(folder)?;
    if !held.is_dir() {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, NOT_A_PRIVATE_FOLDER));
    }

    fs::set_permissions(folder, fs::Permissions::from_mode(FOLDER_MODE))
}

pub fn write_private_file(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let mut file = OpenOptions::new().write(true).create_new(true).mode(FILE_MODE).open(path)?;
    file.write_all(bytes)
}

pub fn remove_file(path: &Path) -> io::Result<()> {
    match fs::remove_file(path) {
        Err(failure) if failure.kind() == io::ErrorKind::NotFound => Ok(()),
        done => done,
    }
}

fn is_older_than(path: &Path, age: Duration, now: SystemTime) -> bool {
    let written = fs::symlink_metadata(path).and_then(|meta| meta.modified());
    written.ok().and_then(|at| now.duration_since(at).ok()).is_some_and(|held| held >= age)
}

pub fn remove_older_than(folder: &Path, age: Duration, now: SystemTime) -> io::Result<usize> {
    let mut removed = 0;
    for entry in fs::read_dir(folder)? {
        let path = entry?.path();
        if is_older_than(&path, age, now) && remove_file(&path).is_ok() {
            removed += 1;
        }
    }
    Ok(removed)
}
