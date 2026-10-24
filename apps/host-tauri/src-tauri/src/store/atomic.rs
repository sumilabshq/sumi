use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

static TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(0);

pub fn write_atomically(file: &Path, bytes: &[u8]) -> io::Result<()> {
    let temp = write_temp(file, bytes)?;
    commit_temp(&temp, file)
}

pub fn write_temp(file: &Path, bytes: &[u8]) -> io::Result<PathBuf> {
    let temp = file.with_file_name(format!(
        "{}{}-{}",
        temp_prefix(file),
        std::process::id(),
        TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed)
    ));
    let mut out = OpenOptions::new().write(true).create_new(true).open(&temp)?;
    out.write_all(bytes)?;
    out.sync_all()?;
    Ok(temp)
}

pub fn commit_temp(temp: &Path, file: &Path) -> io::Result<()> {
    fs::rename(temp, file)?;
    File::open(folder_of(file))?.sync_all()
}

pub fn sweep_temps(file: &Path) -> io::Result<()> {
    let prefix = temp_prefix(file);
    let Ok(entries) = fs::read_dir(folder_of(file)) else {
        return Ok(());
    };
    for entry in entries.flatten() {
        if entry.file_name().to_string_lossy().starts_with(&prefix) {
            fs::remove_file(entry.path())?;
        }
    }

    Ok(())
}

pub fn temp_prefix(file: &Path) -> String {
    let name = file.file_name().map(|name| name.to_string_lossy()).unwrap_or_default();
    format!(".{name}.tmp-")
}

fn folder_of(file: &Path) -> &Path {
    file.parent().unwrap_or_else(|| Path::new("."))
}
