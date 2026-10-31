use super::paths::{is_plain_file, is_plain_folder, refuse_symlink};
use super::release::{sha256_hex, VerifiedRelease};
use std::collections::BTreeMap;
use std::fs::{self, File, OpenOptions, Permissions};
use std::io::Write;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;

pub const INCOMING_PREFIX: &str = ".incoming-";

const READ_ONLY: u32 = 0o444;

pub fn install_release(apps: &Path, release: &VerifiedRelease) -> Result<(), String> {
    let app_folder = apps.join(&release.id);
    refuse_symlink(&app_folder)?;
    fs::create_dir_all(&app_folder).map_err(|failure| format!("{} cannot be made: {failure}", app_folder.display()))?;
    sweep_incoming(&app_folder)?;
    let target = app_folder.join(&release.version);
    refuse_symlink(&target)?;
    if fs::symlink_metadata(&target).is_ok() {
        return refuse_different(&target, release);
    }

    let incoming = app_folder.join(format!("{INCOMING_PREFIX}{}", uuid::Uuid::new_v4()));
    let laid = lay_files(&incoming, release)
        .and_then(|()| fs::rename(&incoming, &target))
        .and_then(|()| File::open(&app_folder)?.sync_all());
    if let Err(failure) = laid {
        if let Err(left) = fs::remove_dir_all(&incoming) {
            eprintln!("[apps] {} left behind after a failed install ({left})", incoming.display());
        }

        return Err(format!("{} {} was not installed: {failure}", release.id, release.version));
    }

    Ok(())
}

fn sweep_incoming(app_folder: &Path) -> Result<(), String> {
    let entries = fs::read_dir(app_folder).map_err(|failure| format!("{} cannot be listed: {failure}", app_folder.display()))?;
    let leftovers = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.file_name().and_then(|name| name.to_str()).is_some_and(|name| name.starts_with(INCOMING_PREFIX)))
        .filter(|path| is_plain_folder(path));
    for leftover in leftovers {
        fs::remove_dir_all(&leftover).map_err(|failure| format!("{} cannot be swept: {failure}", leftover.display()))?;
        eprintln!("[apps] {} left by an interrupted install → swept", leftover.display());
    }

    Ok(())
}

fn lay_files(incoming: &Path, release: &VerifiedRelease) -> std::io::Result<()> {
    fs::create_dir(incoming)?;
    for file in &release.files {
        let destination = incoming.join(&file.path);
        if let Some(folder) = destination.parent() {
            fs::create_dir_all(folder)?;
        }

        let mut out = OpenOptions::new().write(true).create_new(true).open(&destination)?;
        out.write_all(&file.bytes)?;
        out.sync_all()?;
        fs::set_permissions(&destination, Permissions::from_mode(READ_ONLY))?;
    }

    File::open(incoming)?.sync_all()
}

fn refuse_different(target: &Path, release: &VerifiedRelease) -> Result<(), String> {
    let wanted: BTreeMap<String, String> =
        release.files.iter().map(|file| (file.path.clone(), file.sha256.clone())).collect();
    if hashes_on_disk(target).as_ref() == Some(&wanted) {
        return Ok(());
    }

    Err(format!(
        "{} {} is already installed with different content; a version is never rewritten",
        release.id, release.version
    ))
}

fn hashes_on_disk(folder: &Path) -> Option<BTreeMap<String, String>> {
    let mut hashes = BTreeMap::new();
    collect_hashes(folder, "", &mut hashes)?;
    Some(hashes)
}

fn collect_hashes(folder: &Path, prefix: &str, hashes: &mut BTreeMap<String, String>) -> Option<()> {
    if !is_plain_folder(folder) {
        return None;
    }

    for entry in fs::read_dir(folder).ok()? {
        let path = entry.ok()?.path();
        let name = path.file_name()?.to_str()?.to_owned();
        let relative = format!("{prefix}{name}");
        if is_plain_file(&path) {
            hashes.insert(relative, sha256_hex(&fs::read(&path).ok()?));
            continue;
        }

        collect_hashes(&path, &format!("{relative}/"), hashes)?;
    }

    Some(())
}
