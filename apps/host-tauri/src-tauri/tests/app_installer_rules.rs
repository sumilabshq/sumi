use serde_json::{json, Value};
use std::fs;
use std::os::unix::fs::symlink;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use widgetarium_host_tauri_lib::app_installer::dispatch::{answer_of, call_of};
use widgetarium_host_tauri_lib::app_installer::release::{inspect, sha256_hex, MANIFEST_FILE, MAX_FILE_BYTES, RELEASE_FILE};
use widgetarium_host_tauri_lib::app_installer::scheme::{frame_policy, respond};
use widgetarium_host_tauri_lib::app_installer::versions::STORE_FILE;
use widgetarium_host_tauri_lib::app_installer::{AppInstaller, REGISTRY_FILE};

const INDEX: &str = "<!doctype html><title>tasks</title>";
const SCRIPT: &str = "console.log('tasks')";

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

    fn refused(&mut self, what: &str, answer: Result<Value, String>) {
        let refusal = answer.as_ref().err().cloned().unwrap_or_default();
        println!("      {what} → {refusal}");
        self.check(what, answer.is_err(), true);
    }

    fn refused_with(&mut self, what: &str, answer: Result<Value, String>, reason: &str) {
        let refusal = answer.err().unwrap_or_default();
        println!("      {what} → {refusal}");
        self.check(what, refusal.contains(reason), true);
    }
}

struct Sandbox {
    path: PathBuf,
}

impl Sandbox {
    fn new(name: &str) -> Self {
        let path = std::env::temp_dir().join(format!("app-installer-rules-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).expect("a sandbox");
        Self { path }
    }

    fn apps(&self) -> PathBuf {
        self.path.join("apps")
    }

    fn installer(&self) -> AppInstaller {
        AppInstaller::new(self.apps())
    }

    fn install(&self, id: &str, release: &Path) -> Result<Value, String> {
        self.installer().install(id, release, manifest_sha256_of(release).as_str())
    }

    fn release(&self, folder: &str, id: &str, version: &str, index: &str) -> PathBuf {
        let root = self.path.join(folder);
        fs::create_dir_all(root.join("assets")).expect("a release folder");
        let manifest = json!({ "id": id, "name": "Tasks", "version": version, "ui": "index.html" }).to_string();
        let files = [(MANIFEST_FILE, manifest.as_str()), ("index.html", index), ("assets/app.js", SCRIPT)];
        for (path, text) in files {
            fs::write(root.join(path), text).expect("a release file");
        }

        let listed: Vec<Value> = files
            .iter()
            .map(|(path, text)| json!({ "path": path, "sha256": sha256_hex(text.as_bytes()), "size": text.len() }))
            .collect();
        write_json(&root.join(RELEASE_FILE), &json!({ "app": id, "version": version, "files": listed }));
        root
    }
}

impl Drop for Sandbox {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

fn write_json(file: &Path, doc: &Value) {
    fs::write(file, doc.to_string()).expect("a JSON file");
}

fn edit_listing(release: &Path, edit: impl FnOnce(&mut Value)) {
    let file = release.join(RELEASE_FILE);
    let mut doc: Value = serde_json::from_str(&fs::read_to_string(&file).expect("the listing")).expect("JSON");
    edit(&mut doc);
    write_json(&file, &doc);
}

fn listed_index(doc: &mut Value) -> &mut Value {
    &mut doc["files"][1]
}

fn installs_and_is_idempotent(checks: &mut Checks) {
    let sandbox = Sandbox::new("install");
    let installer = sandbox.installer();
    let release = sandbox.release("tasks-1.0.0", "tasks", "1.0.0", INDEX);
    checks.check("install answers id and version", sandbox.install("tasks", &release), Ok(json!({ "id": "tasks", "version": "1.0.0" })));
    let laid = fs::read_to_string(sandbox.apps().join("tasks/1.0.0/assets/app.js")).ok();
    checks.check("install copies every listed file", laid.as_deref(), Some(SCRIPT));
    let first_row = json!({ "current": "1.0.0", "previous": null, "failed": [], "versions": ["1.0.0"] });
    checks.check("a first install becomes current", installer.installed(), Ok(json!({ "apps": { "tasks": first_row } })));
    checks.check("install twice is idempotent", sandbox.install("tasks", &release).is_ok(), true);
    let incoming = fs::read_dir(sandbox.apps().join("tasks")).map(|entries| entries.count()).unwrap_or_default();
    checks.check("no incoming folder is left behind", incoming, 1);

    let changed = sandbox.release("tasks-1.0.0-changed", "tasks", "1.0.0", "<!doctype html><title>other</title>");
    checks.refused("the same version with different content is refused", sandbox.install("tasks", &changed));
    let kept = fs::read_to_string(sandbox.apps().join("tasks/1.0.0/index.html")).ok();
    checks.check("an installed version is never rewritten", kept.as_deref(), Some(INDEX));
    checks.check("inspect reads the manifest", inspected(&release)["manifest"]["id"].clone(), json!("tasks"));
    checks.check("inspect answers the manifest's sha256", inspected(&release)["manifestSha256"].clone(), json!(manifest_sha256_of(&release)));
}

fn inspected(release: &Path) -> Value {
    inspect(release).unwrap_or(Value::Null)
}

fn manifest_sha256_of(release: &Path) -> String {
    fs::read(release.join(MANIFEST_FILE)).map(|bytes| sha256_hex(&bytes)).unwrap_or_default()
}

fn refuses_bad_releases(checks: &mut Checks) {
    let sandbox = Sandbox::new("refusals");
    let installer = sandbox.installer();

    let wrong_hash = sandbox.release("wrong-hash", "tasks", "1.0.0", INDEX);
    edit_listing(&wrong_hash, |doc| listed_index(doc)["sha256"] = json!("0".repeat(64)));
    checks.refused("a wrong sha256 is refused", sandbox.install("tasks", &wrong_hash));

    let wrong_size = sandbox.release("wrong-size", "tasks", "1.0.0", INDEX);
    edit_listing(&wrong_size, |doc| listed_index(doc)["size"] = json!(INDEX.len() + 1));
    checks.refused("a wrong size is refused", sandbox.install("tasks", &wrong_size));

    let missing = sandbox.release("missing", "tasks", "1.0.0", INDEX);
    fs::remove_file(missing.join("index.html")).expect("a removed file");
    checks.refused("a missing file is refused", sandbox.install("tasks", &missing));

    let escaping = sandbox.release("escaping", "tasks", "1.0.0", INDEX);
    fs::write(sandbox.path.join("outside.txt"), SCRIPT).expect("an outside file");
    let outside = json!({ "path": "../outside.txt", "sha256": sha256_hex(SCRIPT.as_bytes()), "size": SCRIPT.len() });
    edit_listing(&escaping, |doc| doc["files"].as_array_mut().expect("files").push(outside));
    checks.refused("a ../ path is refused", sandbox.install("tasks", &escaping));

    let linked = sandbox.release("linked", "tasks", "1.0.0", INDEX);
    fs::write(sandbox.path.join("index-copy.html"), INDEX).expect("a copy");
    fs::remove_file(linked.join("index.html")).expect("a removed file");
    symlink(sandbox.path.join("index-copy.html"), linked.join("index.html")).expect("a symlink");
    checks.refused("a symlinked file is refused", sandbox.install("tasks", &linked));

    let named_other = sandbox.release("named-other", "notes", "1.0.0", INDEX);
    checks.refused("an id that is not the manifest's is refused", sandbox.install("tasks", &named_other));

    let release_disagrees = sandbox.release("release-disagrees", "tasks", "1.0.0", INDEX);
    edit_listing(&release_disagrees, |doc| doc["app"] = json!("notes"));
    checks.refused("a release naming another app is refused", sandbox.install("tasks", &release_disagrees));

    let relative = Path::new("tasks-release");
    checks.refused("a relative source path is refused", installer.install("tasks", relative, ""));
    checks.check("no refused release reached the apps folder", sandbox.apps().join("tasks").exists(), false);
}

fn switches_and_fails(checks: &mut Checks) {
    let sandbox = Sandbox::new("versions");
    let installer = sandbox.installer();
    let first = sandbox.release("first", "tasks", "1.0.0", INDEX);
    let second = sandbox.release("second", "tasks", "1.0.1", INDEX);
    let row = |current: Value, previous: Value, failed: Value| {
        json!({ "current": current, "previous": previous, "failed": failed, "versions": ["1.0.0", "1.0.1"] })
    };
    let moved = |was: Value, now: Value| Ok(json!({ "was": was, "now": now }));
    let _ = sandbox.install("tasks", &first);
    let _ = sandbox.install("tasks", &second);
    let installed = installer.installed().map(|all| all["apps"]["tasks"].clone());
    let first_current = row(json!("1.0.0"), Value::Null, json!([]));
    let switched = row(json!("1.0.1"), json!("1.0.0"), json!([]));
    let failed_back = row(json!("1.0.0"), Value::Null, json!(["1.0.1"]));
    checks.check("a second install leaves current alone", installed, Ok(first_current.clone()));
    checks.check("switch answers was and now", installer.switch("tasks", "1.0.1"), moved(first_current, switched.clone()));
    checks.check("fail of current brings previous back, as was and now", installer.fail("tasks", "1.0.1"), moved(switched, failed_back.clone()));
    checks.refused("a failed version cannot be switched to", installer.switch("tasks", "1.0.1"));
    checks.refused("an uninstalled version cannot be switched to", installer.switch("tasks", "2.0.0"));
    checks.refused("an uninstalled version cannot be failed", installer.fail("tasks", "2.0.0"));
    let _ = sandbox.install("tasks", &second);
    let after = installer.installed().map(|all| all["apps"]["tasks"]["current"].clone());
    checks.check("reinstalling a failed version does not make it current", after, Ok(json!("1.0.0")));
    let retried = row(json!("1.0.0"), Value::Null, json!([]));
    checks.check("retry clears a failure and leaves current, as was and now", installer.retry("tasks", "1.0.1"), moved(failed_back, retried));
    checks.check("a retried version can be switched to", installer.switch("tasks", "1.0.1").is_ok(), true);
    let _ = installer.fail("tasks", "1.0.1");
    let _ = installer.fail("tasks", "1.0.0");
    let none_current = installer.installed().map(|all| all["apps"]["tasks"]["current"].clone());
    checks.check("failing every version leaves no current", none_current, Ok(Value::Null));
    let through_dispatch = answer_of(&installer, &call_of("retry", json!({ "id": "tasks", "version": "1.0.1" })));
    let now_current = through_dispatch.and_then(Result::ok).map(|answer| answer["now"]["current"].clone());
    checks.check("retry through dispatch makes the version current when none is", now_current, Some(json!("1.0.1")));
    checks.refused("an uninstalled version cannot be retried", installer.retry("tasks", "2.0.0"));
}

fn dispatch_reads_typed_args(checks: &mut Checks) {
    let sandbox = Sandbox::new("dispatch");
    let installer = sandbox.installer();
    let release = sandbox.release("first", "tasks", "1.0.0", INDEX);
    let answer = |command: &str, args: Value| answer_of(&installer, &call_of(command, args)).unwrap_or_else(|| Err("no command".to_owned()));
    let path = release.to_string_lossy().to_string();
    let sha = manifest_sha256_of(&release);
    checks.refused_with("install without manifestSha256 is refused", answer("install", json!({ "id": "tasks", "path": path })), "has no manifestSha256");
    let extra = json!({ "id": "tasks", "path": path, "manifestSha256": sha, "force": true });
    checks.refused_with("an unknown argument is refused", answer("install", extra), "unknown field force");
    checks.refused_with("a snake_case argument is refused", answer("inspect", json!({ "path": path, "manifest_sha256": sha })), "unknown field manifest_sha256");
    let installed = answer("install", json!({ "id": "tasks", "path": path, "manifestSha256": sha }));
    checks.check("install through dispatch answers id and version", installed, Ok(json!({ "id": "tasks", "version": "1.0.0" })));
    let inspected = answer("inspect", json!({ "path": path })).map(|answer| answer["manifestSha256"].clone());
    checks.check("inspect through dispatch answers manifestSha256", inspected, Ok(json!(sha)));
}

fn refuses_built_in_names(checks: &mut Checks) {
    let sandbox = Sandbox::new("built-in");
    for id in ["canvas", "browser", "terminal", "chat", "app"] {
        let release = sandbox.release(id, id, "1.0.0", INDEX);
        let refusal = sandbox.install(id, &release).err();
        checks.check(&format!("{id} is refused as a built-in app name"), refusal, Some(format!("{id} is a built-in app name")));
    }

    checks.check("no built-in name reached the apps folder", installed_ids(&sandbox.apps()), Vec::<String>::new());
}

fn installed_ids(apps: &Path) -> Vec<String> {
    fs::read_dir(apps)
        .map(|entries| entries.flatten().filter(|entry| entry.path().is_dir()).map(|entry| entry.file_name().to_string_lossy().to_string()).collect())
        .unwrap_or_default()
}

fn refuses_a_release_changed_after_check(checks: &mut Checks) {
    let sandbox = Sandbox::new("changed");
    let release = sandbox.release("first", "tasks", "1.0.0", INDEX);
    let checked = manifest_sha256_of(&release);
    let swapped = json!({ "id": "tasks", "name": "Tasks", "version": "1.0.0", "ui": "index.html", "navigates": ["*"] }).to_string();
    fs::write(release.join(MANIFEST_FILE), &swapped).expect("a swapped manifest");
    let relisted = json!({ "path": MANIFEST_FILE, "sha256": sha256_hex(swapped.as_bytes()), "size": swapped.len() });
    edit_listing(&release, |doc| doc["files"][0] = relisted);
    let answer = sandbox.installer().install("tasks", &release, &checked);
    checks.check("a manifest swapped after inspect is refused", answer, Err("the release changed after it was checked".to_owned()));
    checks.check("a release changed after check lays nothing", sandbox.apps().join("tasks/1.0.0").exists(), false);
    checks.check("the same release with its new sha256 installs", sandbox.install("tasks", &release).is_ok(), true);
}

fn refuses_oversized_releases(checks: &mut Checks) {
    let sandbox = Sandbox::new("caps");
    let huge_file = sandbox.release("huge-file", "tasks", "1.0.0", INDEX);
    edit_listing(&huge_file, |doc| listed_index(doc)["size"] = json!(MAX_FILE_BYTES + 1));
    checks.refused_with("a file listed past 64 MiB is refused before reading", sandbox.install("tasks", &huge_file), "64 MiB a file may hold");

    let huge_release = sandbox.release("huge-release", "tasks", "1.0.0", INDEX);
    let big_rows: Vec<Value> = (0..9).map(|index| json!({ "path": format!("big-{index}.bin"), "sha256": "0".repeat(64), "size": 60u64 << 20 })).collect();
    edit_listing(&huge_release, |doc| doc["files"].as_array_mut().expect("files").extend(big_rows));
    checks.refused_with("a release listed past 512 MiB is refused before reading", sandbox.install("tasks", &huge_release), "512 MiB a release may hold");

    let crowded = sandbox.release("crowded", "tasks", "1.0.0", INDEX);
    let many_rows: Vec<Value> = (0..10_000).map(|index| json!({ "path": format!("f-{index}"), "sha256": "0".repeat(64), "size": 1 })).collect();
    edit_listing(&crowded, |doc| doc["files"].as_array_mut().expect("files").extend(many_rows));
    checks.refused_with("a release past 10000 files is refused", sandbox.install("tasks", &crowded), "10000 a release may hold");

    let grown = sandbox.release("grown", "tasks", "1.0.0", INDEX);
    fs::write(grown.join("index.html"), format!("{INDEX}{}", " ".repeat(4096))).expect("a grown file");
    checks.refused_with("a file larger on disk than listed is refused by its size", sandbox.install("tasks", &grown), "the release says");
    checks.check("no oversized release reached the apps folder", sandbox.apps().join("tasks").exists(), false);
}

fn sweeps_leftover_incoming(checks: &mut Checks) {
    let sandbox = Sandbox::new("sweep");
    let leftover = sandbox.apps().join("tasks/.incoming-stale");
    fs::create_dir_all(leftover.join("assets")).expect("a leftover folder");
    fs::write(leftover.join("assets/app.js"), SCRIPT).expect("a leftover file");
    let release = sandbox.release("first", "tasks", "1.0.0", INDEX);
    checks.check("install after an interrupted one succeeds", sandbox.install("tasks", &release).is_ok(), true);
    checks.check("install sweeps a leftover .incoming- folder", leftover.exists(), false);
    checks.check("the sweep leaves installed versions", sandbox.apps().join("tasks/1.0.0/index.html").exists(), true);
}

fn corrupt_store_json_is_refused(checks: &mut Checks) {
    let sandbox = Sandbox::new("corrupt");
    let installer = sandbox.installer();
    let first = sandbox.release("first", "tasks", "1.0.0", INDEX);
    let _ = sandbox.install("tasks", &first);
    let file = sandbox.apps().join(STORE_FILE);
    fs::write(&file, "{ not json").expect("a corrupt store.json");
    checks.refused("installed refuses a corrupt store.json", installer.installed());
    checks.refused("switch refuses a corrupt store.json", installer.switch("tasks", "1.0.0"));
    let second = sandbox.release("second", "tasks", "1.0.1", INDEX);
    checks.refused("install refuses a corrupt store.json", sandbox.install("tasks", &second));
    checks.check("a refused install lays nothing", sandbox.apps().join("tasks/1.0.1").exists(), false);
    checks.check("a corrupt store.json is never reset", fs::read_to_string(&file).ok().as_deref(), Some("{ not json"));
    write_json(&file, &json!({ "apps": { "tasks": { "current": 7 } } }));
    checks.refused("a row of the wrong shape is refused", installer.installed());
}

fn names_the_listed_row_it_refuses(checks: &mut Checks) {
    let sandbox = Sandbox::new("listed-row");
    let extra = sandbox.release("extra", "tasks", "1.0.0", INDEX);
    edit_listing(&extra, |doc| listed_index(doc)["mode"] = json!("0644"));
    checks.refused_with("an unknown field in a file row names the row", sandbox.install("tasks", &extra), "file row 1 of sumi-release.json has an unknown field mode");
    let sizeless = sandbox.release("sizeless", "tasks", "1.0.0", INDEX);
    edit_listing(&sizeless, |doc| {
        listed_index(doc).as_object_mut().expect("a row").remove("size");
    });
    checks.refused_with("a missing field in a file row names the row", sandbox.install("tasks", &sizeless), "file row 1 of sumi-release.json has no size");
    let lacking = sandbox.release("lacking", "tasks", "1.0.0", INDEX);
    edit_listing(&lacking, |doc| {
        doc.as_object_mut().expect("a listing").remove("app");
    });
    checks.refused_with("a missing listing field is named", sandbox.install("tasks", &lacking), "sumi-release.json has no app");
}

fn registry_reads_raw(checks: &mut Checks) {
    let sandbox = Sandbox::new("registry");
    let installer = sandbox.installer();
    checks.check("an absent registry is empty", installer.registry(), Ok(json!({ "apps": [] })));
    let rows = json!({ "apps": [{ "id": "tasks", "source": { "kind": "folder", "path": "/tmp/tasks" } }] });
    fs::create_dir_all(sandbox.apps()).expect("the apps folder");
    write_json(&sandbox.apps().join(REGISTRY_FILE), &rows);
    checks.check("the registry is answered as written", installer.registry(), Ok(rows));
}

fn header<'a>(headers: &'a [(&'static str, String)], name: &str) -> Option<&'a str> {
    headers.iter().find(|(known, _)| *known == name).map(|(_, value)| value.as_str())
}

fn scheme_serves_installed_files(checks: &mut Checks) {
    let sandbox = Sandbox::new("scheme");
    let installer = sandbox.installer();
    let first = sandbox.release("first", "tasks", "1.0.0", INDEX);
    let _ = sandbox.install("tasks", &first);
    let apps = sandbox.apps();

    let page = respond(&apps, "main", "sumi-app://tasks/1.0.0/index.html");
    let in_studio_window = respond(&apps, "studio-2", "sumi-app://tasks/1.0.0/index.html").status;
    checks.check("a studio window is served", in_studio_window, 200);
    for label in ["page-1", "studio-", ""] {
        let in_tab = respond(&apps, label, "sumi-app://tasks/1.0.0/index.html");
        checks.check(&format!("webview {label:?} gets 404 and no file"), (in_tab.status, in_tab.body.as_slice()), (404, b"not found".as_slice()));
    }
    checks.check("the scheme serves an installed file", (page.status, page.body.as_slice()), (200, INDEX.as_bytes()));
    checks.check("html is served as html", header(&page.headers, "Content-Type"), Some("text/html; charset=utf-8"));
    checks.check("any origin may read it", header(&page.headers, "Access-Control-Allow-Origin"), Some("*"));
    let policy = frame_policy("tasks");
    checks.check("the frame policy of the served app rides every file", header(&page.headers, "Content-Security-Policy"), Some(policy.as_str()));
    let script = respond(&apps, "main", "sumi-app://tasks/1.0.0/assets/app.js?v=1");
    checks.check("a nested module is served as javascript", header(&script.headers, "Content-Type"), Some("text/javascript; charset=utf-8"));

    symlink(sandbox.path.join("first/index.html"), apps.join("tasks/1.0.0/linked.html")).expect("a symlink");
    let refused_uris = [
        "sumi-app://tasks/1.0.0/../1.0.0/index.html",
        "sumi-app://tasks/1.0.0/%2e%2e/1.0.0/index.html",
        "sumi-app://tasks/1.0.0/assets/%2E%2E%2F..%2Findex.html",
        "sumi-app://tasks/9.9.9/index.html",
        "sumi-app://tasks/.incoming-x/index.html",
        "sumi-app://tasks/1.0.0//etc/passwd",
        "sumi-app://tasks/1.0.0/linked.html",
        "sumi-app://tasks/1.0.0/",
        "sumi-app://../apps/tasks/1.0.0/index.html",
    ];
    for uri in refused_uris {
        checks.check(&format!("{uri} is 404"), respond(&apps, "main", uri).status, 404);
    }
}

fn frame_policy_never_reaches_ipc(checks: &mut Checks) {
    let policy = frame_policy("tasks");
    checks.check("the frame policy is one line", policy.contains('\n'), false);
    let connect = policy
        .split(';')
        .map(str::trim)
        .find_map(|directive| directive.strip_prefix("connect-src "))
        .unwrap_or_default();
    checks.check("the frame policy names connect-src", connect.is_empty(), false);
    let sources: Vec<&str> = connect.split_whitespace().collect();
    let reaches_ipc = sources.iter().any(|source| source.contains("ipc") || *source == "*" || *source == "http:");
    checks.check("connect-src never reaches Tauri IPC", reaches_ipc, false);
    checks.check("default-src is none", policy.starts_with("default-src 'none'"), true);
    let app_sources: Vec<&str> = policy.split([' ', ';']).filter(|source| source.starts_with("sumi-app")).collect();
    checks.check("the policy names sumi-app sources", app_sources.is_empty(), false);
    let only_own = app_sources.iter().all(|source| *source == "sumi-app://tasks");
    checks.check("every sumi-app source is the served app alone", only_own, true);
    checks.check("no placeholder is left in a served policy", policy.contains('{'), false);
    let other = frame_policy("notes");
    checks.check("another app gets its own sources", other.contains("sumi-app://tasks"), false);
}

fn main() -> ExitCode {
    let mut checks = Checks { failed: 0 };
    installs_and_is_idempotent(&mut checks);
    refuses_bad_releases(&mut checks);
    switches_and_fails(&mut checks);
    dispatch_reads_typed_args(&mut checks);
    refuses_built_in_names(&mut checks);
    refuses_a_release_changed_after_check(&mut checks);
    refuses_oversized_releases(&mut checks);
    sweeps_leftover_incoming(&mut checks);
    corrupt_store_json_is_refused(&mut checks);
    names_the_listed_row_it_refuses(&mut checks);
    registry_reads_raw(&mut checks);
    scheme_serves_installed_files(&mut checks);
    frame_policy_never_reaches_ipc(&mut checks);
    println!("{} check(s) failed", checks.failed);
    if checks.failed == 0 {
        return ExitCode::SUCCESS;
    }

    ExitCode::FAILURE
}
