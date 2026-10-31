use super::paths::{checked_app_id, checked_parts, checked_version, path_in, refuse_relative, refuse_symlink};
use super::strict_json::{object_of, strict_object_of, text_of};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
use std::fmt::Write;
use std::fs::{self, File};
use std::io::Read;
use std::path::Path;

pub const MANIFEST_FILE: &str = "sumi-app.json";
pub const RELEASE_FILE: &str = "sumi-release.json";
pub const MAX_FILE_BYTES: u64 = 64 << 20;
pub const MAX_RELEASE_BYTES: u64 = 512 << 20;
pub const MAX_RELEASE_FILES: usize = 10_000;

const CHANGED_AFTER_CHECK: &str = "the release changed after it was checked";
const LISTING_FIELDS: [&str; 3] = ["app", "version", "files"];
const LISTED_FILE_FIELDS: [&str; 3] = ["path", "sha256", "size"];

pub struct VerifiedFile {
    pub path: String,
    pub sha256: String,
    pub bytes: Vec<u8>,
}

pub struct VerifiedRelease {
    pub id: String,
    pub version: String,
    pub files: Vec<VerifiedFile>,
}

struct ReleaseListing {
    app: String,
    version: String,
    files: Vec<ListedFile>,
}

struct ListedFile {
    path: String,
    sha256: String,
    size: u64,
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes).iter().fold(String::new(), |mut hex, byte| {
        let _ = write!(hex, "{byte:02x}");
        hex
    })
}

pub fn read_json(file: &Path) -> Result<Value, String> {
    parsed(&read_small(file)?, &file.display().to_string())
}

pub fn inspect(folder: &Path) -> Result<Value, String> {
    refuse_relative(folder)?;
    let manifest = read_small(&folder.join(MANIFEST_FILE))?;
    Ok(json!({
        "manifest": parsed(&manifest, MANIFEST_FILE)?,
        "manifestSha256": sha256_hex(&manifest),
        "release": read_json(&folder.join(RELEASE_FILE))?,
    }))
}

pub fn verify(folder: &Path, id: &str, manifest_sha256: &str) -> Result<VerifiedRelease, String> {
    refuse_relative(folder)?;
    checked_app_id(id)?;
    let listing = listing_of(&parsed(&read_small(&folder.join(RELEASE_FILE))?, RELEASE_FILE)?)?;
    let version = checked_version(&listing.version)?;
    refuse_bad_listing(&listing.files)?;
    let files = listing.files.iter().map(|file| verified_file(folder, file)).collect::<Result<Vec<_>, _>>()?;
    let manifest = files
        .iter()
        .find(|file| file.path == MANIFEST_FILE)
        .ok_or_else(|| format!("{RELEASE_FILE} does not list {MANIFEST_FILE}"))?;
    if manifest.sha256 != manifest_sha256.to_ascii_lowercase() {
        return Err(CHANGED_AFTER_CHECK.to_owned());
    }

    let manifest_doc = parsed(&manifest.bytes, MANIFEST_FILE)?;
    let identity = object_of(&manifest_doc, MANIFEST_FILE)?;
    refuse_mismatch("the app id", &[id, &listing.app, text_of(identity, "id", MANIFEST_FILE)?])?;
    refuse_mismatch("the version", &[version, text_of(identity, "version", MANIFEST_FILE)?])?;
    Ok(VerifiedRelease {
        id: id.to_owned(),
        version: version.to_owned(),
        files,
    })
}

fn parsed(bytes: &[u8], file: &str) -> Result<Value, String> {
    serde_json::from_slice(bytes).map_err(|failure| format!("{file} is not JSON: {failure}"))
}

fn listing_of(doc: &Value) -> Result<ReleaseListing, String> {
    let object = strict_object_of(doc, &LISTING_FIELDS, RELEASE_FILE)?;
    let rows = object.get("files").and_then(Value::as_array).ok_or_else(|| format!("{RELEASE_FILE} has no files"))?;
    Ok(ReleaseListing {
        app: text_of(object, "app", RELEASE_FILE)?.to_owned(),
        version: text_of(object, "version", RELEASE_FILE)?.to_owned(),
        files: rows.iter().map(listed_file_of).collect::<Result<_, _>>()?,
    })
}

fn listed_file_of(row: &Value) -> Result<ListedFile, String> {
    let what = format!("a file row of {RELEASE_FILE}");
    let object = strict_object_of(row, &LISTED_FILE_FIELDS, &what)?;
    Ok(ListedFile {
        path: text_of(object, "path", &what)?.to_owned(),
        sha256: text_of(object, "sha256", &what)?.to_ascii_lowercase(),
        size: object.get("size").and_then(Value::as_u64).ok_or_else(|| format!("{what} has no size"))?,
    })
}

fn read_small(file: &Path) -> Result<Vec<u8>, String> {
    refuse_symlink(file)?;
    read_at_most(file, MAX_FILE_BYTES)
}

fn read_at_most(file: &Path, limit: u64) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    File::open(file)
        .and_then(|opened| opened.take(limit.saturating_add(1)).read_to_end(&mut bytes))
        .map_err(|failure| format!("{} cannot be read: {failure}", file.display()))?;
    if u64::try_from(bytes.len()).map_or(true, |read| read > limit) {
        return Err(format!("{} holds more than {limit} bytes", file.display()));
    }

    Ok(bytes)
}

fn refuse_mismatch(what: &str, named: &[&str]) -> Result<(), String> {
    if named.windows(2).all(|pair| pair[0] == pair[1]) {
        return Ok(());
    }

    Err(format!("{what} disagrees: {named:?}"))
}

fn refuse_bad_listing(files: &[ListedFile]) -> Result<(), String> {
    if files.len() > MAX_RELEASE_FILES {
        return Err(format!("{RELEASE_FILE} lists {} files, more than the {MAX_RELEASE_FILES} a release may hold", files.len()));
    }

    let mut seen = BTreeSet::new();
    let mut total: u64 = 0;
    for file in files {
        checked_parts(&file.path)?;
        if !seen.insert(file.path.as_str()) {
            return Err(format!("{RELEASE_FILE} lists {} twice", file.path));
        }

        if file.size > MAX_FILE_BYTES {
            return Err(format!("{} is listed at {} bytes, more than the {} MiB a file may hold", file.path, file.size, MAX_FILE_BYTES >> 20));
        }

        total = total.saturating_add(file.size);
    }

    if total > MAX_RELEASE_BYTES {
        return Err(format!("the release lists {total} bytes, more than the {} MiB a release may hold", MAX_RELEASE_BYTES >> 20));
    }

    Ok(())
}

fn verified_file(folder: &Path, listed: &ListedFile) -> Result<VerifiedFile, String> {
    let file = path_in(folder, &listed.path)?;
    let size = fs::symlink_metadata(&file)
        .ok()
        .filter(|meta| meta.file_type().is_file())
        .map(|meta| meta.len())
        .ok_or_else(|| format!("{} is listed but is not a file in the release", listed.path))?;
    if size != listed.size {
        return Err(format!("{} is {size} bytes, the release says {}", listed.path, listed.size));
    }

    let bytes = read_at_most(&file, listed.size)?;
    if u64::try_from(bytes.len()).ok() != Some(listed.size) {
        return Err(format!("{} changed while it was read", listed.path));
    }

    let sha256 = sha256_hex(&bytes);
    if sha256 != listed.sha256 {
        return Err(format!("{} does not match its sha256", listed.path));
    }

    Ok(VerifiedFile {
        path: listed.path.clone(),
        sha256,
        bytes,
    })
}
