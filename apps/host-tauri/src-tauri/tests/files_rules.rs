use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use widgetarium_host_tauri_lib::files::{
    append_file, copy, file_info, make_folder, read_file, read_folder, remove, rename, write_file, EntryKind,
    FolderEntry,
};

struct Checks {
    failed: usize,
}

impl Checks {
    fn check<T: PartialEq + std::fmt::Debug>(&mut self, what: &str, got: T, wanted: T) {
        let ok = got == wanted;

        if !ok {
            self.failed += 1;
        }

        let verdict = if ok { "OK  " } else { "!!  " };
        let detail = if ok { String::new() } else { format!("  got {got:?}, want {wanted:?}") };
        println!("{verdict}{what}{detail}");
    }
}

struct Sandbox {
    root: PathBuf,
}

impl Sandbox {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!("widgetarium-files-rules-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).expect("a temp folder");
        Self { root }
    }

    fn at(&self, relative: &str) -> PathBuf {
        self.root.join(relative)
    }
}

impl Drop for Sandbox {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

fn entry(name: &str, kind: EntryKind) -> FolderEntry {
    FolderEntry {
        name: name.to_owned(),
        kind,
    }
}

fn exists(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok()
}

fn writes_and_reads(checks: &mut Checks, sandbox: &Sandbox) {
    let note = sandbox.at("deep/inside/note.md");
    checks.check("a write creates the parent folders", write_file(&note, "hello ✓"), Ok(()));
    checks.check("the written text reads back", read_file(&note), Ok("hello ✓".to_owned()));
    checks.check("a second write replaces the text", write_file(&note, "two"), Ok(()));
    checks.check("the replaced text reads back", read_file(&note), Ok("two".to_owned()));
    let leftovers = read_folder(&sandbox.at("deep/inside")).map(|entries| entries.len());
    checks.check("an atomic write leaves no temp file", leftovers, Ok(1));
    let missing = sandbox.at("missing.md");
    checks.check("a missing file is an error", read_file(&missing), Err(format!("{} does not exist.", missing.display())));
    let folder = sandbox.at("deep");
    checks.check("a folder is not read as a file", read_file(&folder), Err(format!("{} is a folder, not a file.", folder.display())));
}

fn appends(checks: &mut Checks, sandbox: &Sandbox) {
    let log = sandbox.at("logs/today.log");
    checks.check("an append creates the file and its folder", append_file(&log, "one\n"), Ok(()));
    checks.check("a second append adds to the end", append_file(&log, "two\n"), Ok(()));
    checks.check("both appends are there in order", read_file(&log), Ok("one\ntwo\n".to_owned()));
}

fn tells_info(checks: &mut Checks, sandbox: &Sandbox) {
    let missing = file_info(&sandbox.at("nowhere/at/all")).map(|info| serde_json::to_value(info).expect("json"));
    let wanted = json!({ "exists": false, "kind": null, "size": null, "modifiedMs": null });
    checks.check("a missing path answers exists false with nulls", missing, Ok(wanted));
    let file = sandbox.at("sized.txt");
    let _ = write_file(&file, "12345");
    let info = file_info(&file).expect("info of a file");
    checks.check("a file is a file", info.kind, Some(EntryKind::File));
    checks.check("a file has its size", info.size, Some(5));
    checks.check("a file has a modified time", info.modified_ms.is_some_and(|ms| ms > 0), true);
    checks.check("a folder is a folder", file_info(&sandbox.root).map(|info| info.kind), Ok(Some(EntryKind::Folder)));
}

fn lists_folders(checks: &mut Checks, sandbox: &Sandbox) {
    let folder = sandbox.at("listing");
    let _ = write_file(&folder.join("b.md"), "");
    let _ = write_file(&folder.join("a.md"), "");
    let _ = make_folder(&folder.join("c"));
    let wanted = vec![entry("a.md", EntryKind::File), entry("b.md", EntryKind::File), entry("c", EntryKind::Folder)];
    checks.check("a folder lists sorted by name with kinds", read_folder(&folder), Ok(wanted));
    let json = read_folder(&folder).map(|entries| serde_json::to_value(&entries[2]).expect("json"));
    checks.check("an entry answers name and kind", json, Ok(json!({ "name": "c", "kind": "folder" })));
    let missing = sandbox.at("no-folder");
    checks.check("a missing folder is an error", read_folder(&missing), Err(format!("{} does not exist.", missing.display())));
}

fn removes(checks: &mut Checks, sandbox: &Sandbox) {
    let file = sandbox.at("gone/file.md");
    let _ = write_file(&file, "x");
    checks.check("a file is removed", remove(&file).map(|()| exists(&file)), Ok(false));
    let folder = sandbox.at("gone");
    let _ = write_file(&folder.join("nested/deeper.md"), "x");
    checks.check("a folder is removed with everything in it", remove(&folder).map(|()| exists(&folder)), Ok(false));
    checks.check("a missing path removes as ok", remove(&sandbox.at("never-was")), Ok(()));
}

fn renames(checks: &mut Checks, sandbox: &Sandbox) {
    let from = sandbox.at("before.md");
    let to = sandbox.at("moved/into/after.md");
    let _ = write_file(&from, "kept");
    checks.check("a rename creates the parent of the target", rename(&from, &to), Ok(()));
    checks.check("the source is gone", exists(&from), false);
    checks.check("the target holds the text", read_file(&to), Ok("kept".to_owned()));
}

fn copies(checks: &mut Checks, sandbox: &Sandbox) {
    let from = sandbox.at("tree");
    let _ = write_file(&from.join("top.md"), "top");
    let _ = write_file(&from.join("inner/leaf.md"), "leaf");
    let to = sandbox.at("copies/tree");
    checks.check("a folder copies recursively", copy(&from, &to), Ok(()));
    checks.check("the top file is copied", read_file(&to.join("top.md")), Ok("top".to_owned()));
    checks.check("the nested file is copied", read_file(&to.join("inner/leaf.md")), Ok("leaf".to_owned()));
    checks.check("the source stays", read_file(&from.join("top.md")), Ok("top".to_owned()));
    let single = sandbox.at("copies/single.md");
    checks.check("a file copies", copy(&from.join("top.md"), &single).and_then(|()| read_file(&single)), Ok("top".to_owned()));
}

fn refuses_unsafe_paths(checks: &mut Checks, sandbox: &Sandbox) {
    let relative = Path::new("relative/note.md");
    let refusal = Err("The path relative/note.md is not absolute, so it is refused.".to_owned());
    checks.check("a relative read is refused", read_file(relative), refusal.clone());
    checks.check("a relative write is refused", write_file(relative, "x"), refusal.clone().map(|_: String| ()));
    checks.check("a relative write wrote nothing", exists(relative), false);
    let held = sandbox.at("a\0b");
    let refusal = Err(format!("The path {} holds a NUL character, so it is refused.", held.display()));
    checks.check("a NUL in a path is refused", write_file(&held, "x"), refusal.clone().map(|_: String| ()));
    checks.check("a NUL in a rename target is refused", rename(&sandbox.at("x"), &held), refusal.map(|_: String| ()));
}

fn main() -> ExitCode {
    let mut checks = Checks { failed: 0 };
    let sandbox = Sandbox::new();
    writes_and_reads(&mut checks, &sandbox);
    appends(&mut checks, &sandbox);
    tells_info(&mut checks, &sandbox);
    lists_folders(&mut checks, &sandbox);
    removes(&mut checks, &sandbox);
    renames(&mut checks, &sandbox);
    copies(&mut checks, &sandbox);
    refuses_unsafe_paths(&mut checks, &sandbox);
    let root = sandbox.root.clone();
    drop(sandbox);
    checks.check("the temp folder is deleted at the end", exists(&root), false);

    if checks.failed > 0 {
        println!("files rules: {} check(s) failed", checks.failed);
        return ExitCode::FAILURE;
    }

    println!("files rules: all checks passed");
    ExitCode::SUCCESS
}
