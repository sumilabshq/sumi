use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::os::fd::AsRawFd;
use std::path::{Path, PathBuf};

pub struct RotatingFile {
    pub path: PathBuf,
    pub most_bytes: u64,
    pub kept_old_files: usize,
}

impl RotatingFile {
    pub fn append(&self, line: &str) -> std::io::Result<()> {
        let rotated = if self.would_overflow(line) { self.rotate_under_lock(line) } else { Ok(()) };

        // TRADE-OFF: reopened per line so the mcp and hook processes append safely beside the app
        let mut file = OpenOptions::new().create(true).append(true).open(&self.path)?;
        file.write_all(line.as_bytes())?;
        rotated
    }

    pub fn old_file(&self, age: usize) -> PathBuf {
        let stem = self.path.file_stem().and_then(|stem| stem.to_str()).unwrap_or("log");
        let extension = self.path.extension().and_then(|extension| extension.to_str()).unwrap_or("log");
        self.path.with_file_name(format!("{stem}.{age}.{extension}"))
    }

    fn would_overflow(&self, line: &str) -> bool {
        let size = fs::metadata(&self.path).map(|meta| meta.len()).unwrap_or(0);
        size > 0 && size + line.len() as u64 > self.most_bytes
    }

    fn rotate_under_lock(&self, line: &str) -> std::io::Result<()> {
        let lock = File::create(self.path.with_extension("rotate-lock"))?;

        if unsafe { libc::flock(lock.as_raw_fd(), libc::LOCK_EX) } != 0 {
            return Err(std::io::Error::last_os_error());
        }

        if !self.would_overflow(line) {
            return Ok(());
        }

        self.rotate()
    }

    fn rotate(&self) -> std::io::Result<()> {
        if self.kept_old_files == 0 {
            return fs::remove_file(&self.path);
        }

        remove_if_there(&self.old_file(self.kept_old_files))?;

        for age in (1..self.kept_old_files).rev() {
            rename_if_there(&self.old_file(age), &self.old_file(age + 1))?;
        }

        rename_if_there(&self.path, &self.old_file(1))
    }
}

fn remove_if_there(path: &Path) -> std::io::Result<()> {
    match fs::remove_file(path) {
        Err(failure) if failure.kind() != std::io::ErrorKind::NotFound => Err(failure),
        _ => Ok(()),
    }
}

fn rename_if_there(from: &Path, to: &Path) -> std::io::Result<()> {
    match fs::rename(from, to) {
        Err(failure) if failure.kind() != std::io::ErrorKind::NotFound => Err(failure),
        _ => Ok(()),
    }
}
