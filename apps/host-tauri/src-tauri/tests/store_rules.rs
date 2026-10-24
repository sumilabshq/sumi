use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};
use std::time::{Duration, Instant};
use widgetarium_host_tauri_lib::store::dispatch::{answer_of, call_of};
use widgetarium_host_tauri_lib::store::{atomic, workspaces, Refusal, Store, APP_FOLDER};
use widgetarium_host_tauri_lib::studio_caller::{refuse_foreign_caller, NOT_FROM_STUDIO};

const SETTINGS: &str = "settings.json";
const CHAT: &str = "chat/one.jsonl";
const CRASH_HOME_VARIABLE: &str = "INK_STORE_CRASH_HOME";

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

struct TempHome {
    path: PathBuf,
}

impl TempHome {
    fn new(name: &str) -> Self {
        let path = std::env::temp_dir().join(format!("ink-store-rules-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).expect("a temp home");
        Self { path }
    }

    fn store(&self) -> Store {
        Store::new(self.path.clone())
    }

    fn app_folder(&self) -> PathBuf {
        self.path.join(APP_FOLDER)
    }
}

impl Drop for TempHome {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

fn code_of<T>(answer: Result<T, Refusal>) -> &'static str {
    answer.err().map_or("ok", |refusal| refusal.code())
}

fn ids_of(lines: &[Value]) -> Vec<String> {
    lines.iter().filter_map(|line| line["id"].as_str().map(str::to_owned)).collect()
}

fn temp_beside(file: &Path) -> bool {
    let prefix = atomic::temp_prefix(file);
    let Some(folder) = file.parent() else {
        return false;
    };
    let Ok(entries) = fs::read_dir(folder) else {
        return false;
    };
    entries.flatten().any(|entry| entry.file_name().to_string_lossy().starts_with(&prefix))
}

fn studio_callers(checks: &mut Checks) {
    checks.check("the studio webview may call", refuse_foreign_caller("main"), Ok(()));
    for label in ["tab-1", "page:example.com", "", "Main"] {
        checks.check(&format!("a webview labelled {label:?} is refused"), refuse_foreign_caller(label), Err(NOT_FROM_STUDIO.to_owned()));
    }
}

fn replace_and_rev(checks: &mut Checks) {
    let home = TempHome::new("rev");
    let store = home.store();
    let place = store.place("global", SETTINGS).unwrap();
    checks.check("the first replace answers rev 1", store.replace_doc(&place, json!({ "v": 1, "chatWidthPx": 420 }), 0, "first"), Ok(1));
    checks.check("the next one rev 2", store.replace_doc(&place, json!({ "v": 1, "chatWidthPx": 500 }), 1, "resize"), Ok(2));
    let stale = store.replace_doc(&place, json!({ "v": 1, "chatWidthPx": 1 }), 1, "late writer");
    checks.check("a stale rev is refused", stale, Err(Refusal::StaleRev { current_rev: 2 }));
    checks.check("and the doc is left as it was", store.read_doc(&place).unwrap().doc.unwrap()["chatWidthPx"].clone(), json!(500));
    store.replace_doc(&place, json!({ "v": 3 }), 2, "newer app").unwrap();
    checks.check("a newer v is read-only to an older writer", code_of(store.replace_doc(&place, json!({ "v": 1 }), 3, "older")), "newer-version");
}

fn refused_paths(checks: &mut Checks) {
    let home = TempHome::new("paths");
    let store = home.store();
    for path in ["../escape.json", "/etc/passwd", "a/../b.json", "", "a//b.json", "./a.json", "C:x.json", "a\\b.json", "Settings.json"] {
        checks.check(&format!("{path:?} is refused"), code_of(store.place("global", path)), "bad-path");
    }

    checks.check("an unknown root is refused", code_of(store.place("home", SETTINGS)), "bad-root");
    checks.check("a root id that is not a uuid is refused", code_of(store.place("workspace:../x", SETTINGS)), "bad-root");
    checks.check("a workspace that does not exist is refused", code_of(store.place("workspace:6f1d2a4e-8a43-4c8e-9f55-0a6a4f1d2b3c", SETTINGS)), "no-workspace");
    checks.check("workspaces are not reached through the global root", code_of(store.place("global", "workspaces/x/workspace.json")), "bad-path");
    checks.check("a workspace id that is a path is refused", code_of(workspaces::mark_opened(&store, "../../x")), "bad-root");

    fs::create_dir_all(home.app_folder()).unwrap();
    let outside = home.path.join("outside");
    fs::create_dir_all(&outside).unwrap();
    std::os::unix::fs::symlink(&outside, home.app_folder().join("linked")).unwrap();
    checks.check("a symlink inside the app folder is refused", code_of(store.place("global", "linked/a.json")), "symlink");
}

fn reserved_through_dispatch(checks: &mut Checks) {
    let home = TempHome::new("reserved");
    let store = home.store();
    let doc = json!({ "root": "global", "path": "workspaces.json", "doc": { "v": 1 }, "baseRev": 0, "reason": "page" });
    let answer = answer_of(&store, &call_of("replace", doc)).map(|answer| answer.err().map(|refusal| refusal.code()));
    checks.check("the webview cannot write the workspace list", answer, Some(Some("reserved")));
    let unknown = answer_of(&store, &call_of("delete_everything", json!({}))).is_none();
    checks.check("an unknown command is not answered", unknown, true);
    let missing = answer_of(&store, &call_of("read", json!({ "root": "global" }))).map(|answer| answer.err().map(|refusal| refusal.code()));
    checks.check("a missing argument is refused, not a panic", missing, Some(Some("bad-call")));
}

fn quarantine(checks: &mut Checks) {
    let home = TempHome::new("corrupt");
    let store = home.store();
    let place = store.place("global", SETTINGS).unwrap();
    fs::create_dir_all(home.app_folder()).unwrap();
    fs::write(&place.file, "{ \"v\": 1, \"rev\": 3, \"chat").unwrap();
    let read = store.read_doc(&place).unwrap();
    let kept_aside = read.quarantined.clone().unwrap_or_default();
    checks.check("a corrupt doc reads empty at rev 0", (read.doc.is_none(), read.rev), (true, 0));
    checks.check("and is kept aside under its name", kept_aside.starts_with("settings.json.corrupt-") && home.app_folder().join(&kept_aside).exists(), true);

    fs::write(&place.file, "{ \"v\": 1, \"trace\": true }").unwrap();
    let hand_written = store.read_doc(&place).unwrap();
    checks.check("a hand-written doc without rev reads at rev 0, not quarantined", (hand_written.rev, hand_written.quarantined), (0, None));
}

fn jsonl(checks: &mut Checks) {
    let home = TempHome::new("lines");
    let store = home.store();
    let place = store.place("global", CHAT).unwrap();
    store.append_line(&place, &json!({ "id": "a" })).unwrap();
    let mut bytes = fs::read(&place.file).unwrap();
    bytes.extend_from_slice(b"{\"id\":\"b\",\"te");
    fs::write(&place.file, bytes).unwrap();
    let torn = store.read_lines(&place, None, 10).unwrap();
    checks.check("a torn tail is skipped", (ids_of(&torn.lines), torn.torn_tail), (vec!["a".to_owned()], true));
    store.append_line(&place, &json!({ "id": "c" })).unwrap();
    checks.check("the next append starts a fresh line", ids_of(&store.read_lines(&place, None, 10).unwrap().lines), vec!["a".to_owned(), "c".to_owned()]);
    checks.check("a line with no id is refused", code_of(store.append_line(&place, &json!({ "text": "x" }))), "bad-line");
}

fn paging(checks: &mut Checks) {
    let home = TempHome::new("paging");
    let store = home.store();
    let place = store.place("global", CHAT).unwrap();
    for id in ["1", "2", "x", "3", "4", "x", "5"] {
        store.append_line(&place, &json!({ "id": id })).unwrap();
    }

    let mut shown: Vec<String> = Vec::new();
    let mut before = None;
    loop {
        let page = store.read_lines(&place, before, 2).unwrap();
        let mut ids = ids_of(&page.lines);
        ids.extend(shown);
        shown = ids;
        before = Some(page.cursor);
        if !page.has_earlier {
            break;
        }
    }

    checks.check("paging by byte cursor shows every line, in order", shown.iter().filter(|id| *id != "x").cloned().collect::<Vec<_>>(), ["1", "2", "3", "4", "5"].map(str::to_owned).to_vec());
    checks.check("a repeated id inside one page is shown once", ids_of(&store.read_lines(&place, None, 10).unwrap().lines), ["1", "2", "3", "4", "x", "5"].map(str::to_owned).to_vec());
}

fn workspace_life(checks: &mut Checks) {
    let home = TempHome::new("workspaces");
    let store = home.store();
    let first = workspaces::open_first(&store).unwrap();
    let again = workspaces::open_first(&store).unwrap();
    checks.check("the first workspace is Default and keeps its id", (again.id.clone(), again.name.clone(), again.folder.clone()), (first.id.clone(), "Default".to_owned(), None));
    let made = workspaces::create_new(&store, "Research").unwrap();
    workspaces::rename(&store, &made.id, "Notes").unwrap();
    let listed: Vec<(String, String)> = workspaces::list(&store).unwrap().into_iter().map(|entry| (entry.id, entry.name)).collect();
    checks.check("the list holds both, the last opened first, renamed", listed, vec![(made.id.clone(), "Notes".to_owned()), (first.id.clone(), "Default".to_owned())]);
    checks.check("a blank name is refused", code_of(workspaces::create_new(&store, "  ")), "bad-doc");

    let folder = home.path.join("project");
    fs::create_dir_all(&folder).unwrap();
    workspaces::attach_folder(&store, &first.id, &folder).unwrap();
    checks.check("attaching writes nothing into the folder", fs::read_dir(&folder).unwrap().count(), 0);
    let root = format!("folder:{}", first.id);
    checks.check("a folder root holds only its settings file", code_of(store.place(&root, "local/session.json")), "bad-path");
    checks.check("the working folder is the attached one", workspaces::opened_working_folder(&store).unwrap(), folder.canonicalize().unwrap());
    fs::remove_dir_all(&folder).unwrap();
    checks.check("a missing folder is flagged, the chats stay", (workspaces::mark_opened(&store, &first.id).unwrap().folder_found, store.place(&format!("workspace:{}", first.id), CHAT).is_ok()), (false, true));
    checks.check("a missing folder's root is refused", code_of(store.place(&root, SETTINGS)), "folder-not-found");
}

fn killed_between_write_and_rename(checks: &mut Checks) {
    let home = TempHome::new("crash");
    let store = home.store();
    let place = store.place("global", SETTINGS).unwrap();
    store.replace_doc(&place, json!({ "v": 1, "theme": "old" }), 0, "seed").unwrap();
    let mut child = Command::new(std::env::current_exe().unwrap()).env(CRASH_HOME_VARIABLE, &home.path).spawn().unwrap();
    let started = Instant::now();
    while !temp_beside(&place.file) && started.elapsed() < Duration::from_secs(30) {
        std::thread::sleep(Duration::from_millis(20));
    }
    child.kill().unwrap();
    child.wait().unwrap();
    checks.check("the killed writer reached its temp file", temp_beside(&place.file), true);
    let read = store.read_doc(&place).unwrap();
    checks.check("a kill between write and rename keeps the old doc", (read.rev, read.doc.unwrap()["theme"].clone()), (1, json!("old")));
    store.replace_doc(&place, json!({ "v": 1, "theme": "new" }), 1, "after crash").unwrap();
    checks.check("the next replace sweeps the orphan", temp_beside(&place.file), false);
}

fn crash_child(home: &str) -> ExitCode {
    let store = Store::new(PathBuf::from(home));
    let place = store.place("global", SETTINGS).unwrap();
    atomic::write_temp(&place.file, br#"{"v":1,"rev":2,"theme":"lost"}"#).unwrap();
    loop {
        std::thread::sleep(Duration::from_secs(1));
    }
}

fn recent_folders(checks: &mut Checks) {
    let home = TempHome::new("recent");
    let store = home.store();
    let entry = workspaces::create_new(&store, "Personal").expect("a workspace");
    let picked = home.path.join("habits");
    let other = home.path.join("recipes");
    fs::create_dir_all(&picked).expect("a folder");
    fs::create_dir_all(&other).expect("another folder");
    workspaces::attach_folder(&store, &entry.id, &picked).expect("attached");
    let attached = workspaces::attach_folder(&store, &entry.id, &other).expect("attached again");
    let shown = |path: &Path| path.to_string_lossy().into_owned();
    checks.check("a picked folder joins the recent ones, newest first", attached.recent_folders.clone(), vec![shown(&other), shown(&picked)]);
    let chosen = workspaces::choose_folder(&store, &entry.id, &shown(&picked)).expect("a recent folder is chosen");
    checks.check("a recent folder is chosen without a dialog", (chosen.folder.clone(), chosen.recent_folders[0].clone()), (Some(shown(&picked)), shown(&picked)));
    let never = home.path.join("never-picked");
    fs::create_dir_all(&never).expect("a folder nobody picked");
    checks.check("a folder never picked here is refused", code_of(workspaces::choose_folder(&store, &entry.id, &shown(&never))), "bad-path");
    checks.check("the system folder is refused", code_of(workspaces::choose_folder(&store, &entry.id, "/etc")), "bad-path");
}

fn main() -> ExitCode {
    if let Ok(home) = std::env::var(CRASH_HOME_VARIABLE) {
        return crash_child(&home);
    }

    let mut checks = Checks { failed: 0 };
    studio_callers(&mut checks);
    replace_and_rev(&mut checks);
    refused_paths(&mut checks);
    reserved_through_dispatch(&mut checks);
    quarantine(&mut checks);
    jsonl(&mut checks);
    paging(&mut checks);
    workspace_life(&mut checks);
    recent_folders(&mut checks);
    killed_between_write_and_rename(&mut checks);
    println!("{} check(s) failed", checks.failed);
    if checks.failed == 0 {
        return ExitCode::SUCCESS;
    }

    ExitCode::FAILURE
}
