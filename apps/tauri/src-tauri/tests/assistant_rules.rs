use serde_json::Value;
use std::fs;
use std::os::unix::fs::{symlink, PermissionsExt};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime};
use widgetarium_host_tauri_lib::assistant::attachments::{
    ensure_private_folder, private_folder_for, remove_older_than, write_private_file,
};
use widgetarium_host_tauri_lib::assistant::commands::{self, LaunchAsk, NO_PROJECT};
use widgetarium_host_tauri_lib::assistant::drops::{self, dropped_file_refusal, LARGEST_IMAGE_BYTES, LARGEST_TEXT_BYTES};
use widgetarium_host_tauri_lib::assistant::paths::{attachment_file_in, OUTSIDE_THE_FOLDER, UNSAFE_NAME};
use widgetarium_host_tauri_lib::assistant::providers::PROVIDERS;
use widgetarium_host_tauri_lib::login_path::{find_command, joined_path, path_after_mark};
use widgetarium_host_tauri_lib::assistant::state::Assistant;
use widgetarium_host_tauri_lib::process_runs::{ProcessLaunch, ProcessRuns, ProcessSink};
use widgetarium_host_tauri_lib::assistant::attachments_script;

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

fn scratch(name: &str) -> PathBuf {
    let folder = std::env::temp_dir().join(format!("widgetarium-rules-{}-{name}", std::process::id()));
    let _ = fs::remove_dir_all(&folder);
    fs::create_dir_all(&folder).expect("a scratch folder");
    folder
}

fn mode_of(path: &Path) -> u32 {
    fs::metadata(path).expect("the path exists").permissions().mode() & 0o777
}

fn recording_sink() -> (ProcessSink, Arc<Mutex<Vec<Value>>>) {
    let heard = Arc::new(Mutex::new(Vec::new()));
    let kept = heard.clone();
    (Arc::new(move |event: Value| kept.lock().expect("the events").push(event)), heard)
}

fn wait_for_exit(heard: &Arc<Mutex<Vec<Value>>>, within: Duration) -> Option<Value> {
    let started = Instant::now();
    while started.elapsed() < within {
        let found = heard.lock().expect("the events").iter().find(|event| event["kind"] == "exited").cloned();
        if found.is_some() {
            return found;
        }
        thread::sleep(Duration::from_millis(20));
    }
    None
}

fn allowlist(checks: &mut Checks) {
    let ids: Vec<&str> = PROVIDERS.iter().map(|provider| provider.id).collect();
    checks.check("the host builds no command line: only Claude Code's facts are left", ids, vec!["claude-code"]);
}

fn turn_refusals(checks: &mut Checks) {
    let attachments = scratch("refusals");
    let assistant = Assistant::new(attachments.clone());
    let project = Some(attachments.as_path());
    let (sink, _) = recording_sink();
    let launch = |program: &str| LaunchAsk { program: program.to_string(), args: vec!["hi".into()], env: Vec::new() };

    let no_project = commands::start_launch(&assistant, None, &launch("sh"), sink.clone());
    checks.check("no project folder means no turn", no_project.err(), Some(NO_PROJECT.into()));
    let missing = commands::start_launch(&assistant, project, &launch("no-such-widgetarium-tool"), sink);
    checks.check(
        "a program that is not on the machine is refused",
        missing.err(),
        Some("no-such-widgetarium-tool is not installed on this machine, or is not on the login shell's PATH.".into()),
    );
}

fn attachment_paths(checks: &mut Checks) {
    let folder = scratch("paths");
    let inside = folder.join("1f2e-shot.png");
    let shown = |path: &Path| path.to_string_lossy().into_owned();
    checks.check("a file directly inside is accepted", attachment_file_in(&folder, &shown(&inside)).ok(), Some(folder.canonicalize().unwrap().join("1f2e-shot.png")));

    let climbing = format!("{}/../{}/x.png", shown(&folder), folder.file_name().unwrap().to_string_lossy());
    checks.check("a path that climbs out is refused", attachment_file_in(&folder, &climbing).err(), Some(OUTSIDE_THE_FOLDER.into()));
    checks.check("a path in another folder is refused", attachment_file_in(&folder, "/etc/passwd").err(), Some(OUTSIDE_THE_FOLDER.into()));
    checks.check("a relative path is refused", attachment_file_in(&folder, "x.png").err(), Some(OUTSIDE_THE_FOLDER.into()));
    let spaced = shown(&folder.join("a b.png"));
    checks.check("a name with unsafe letters is refused", attachment_file_in(&folder, &spaced).err(), Some(UNSAFE_NAME.into()));

    fs::create_dir_all(folder.join("deeper")).expect("a nested folder");
    let nested = shown(&folder.join("deeper").join("x.png"));
    checks.check("a file in a nested folder is refused", attachment_file_in(&folder, &nested).err(), Some(OUTSIDE_THE_FOLDER.into()));

    let elsewhere = scratch("elsewhere");
    let linked = folder.join("linked");
    symlink(&elsewhere, &linked).expect("a link");
    let through_link = shown(&linked.join("x.png"));
    checks.check("a file behind a link to elsewhere is refused", attachment_file_in(&folder, &through_link).err(), Some(OUTSIDE_THE_FOLDER.into()));
}

fn private_files(checks: &mut Checks) {
    let temp = scratch("private");
    let folder = private_folder_for(&temp, 501);
    checks.check("the folder is named for the user", folder.file_name().map(|name| name.to_string_lossy().into_owned()), Some("widgetarium-attachments-501".into()));
    ensure_private_folder(&folder).expect("the folder is made");
    checks.check("the folder is private to its owner", mode_of(&folder), 0o700);

    let file = folder.join("a.txt");
    write_private_file(&file, b"hello").expect("the file is written");
    checks.check("the file is private to its owner", mode_of(&file), 0o600);
    checks.check("an existing file is never overwritten", write_private_file(&file, b"again").is_err(), true);

    let later = SystemTime::now() + Duration::from_secs(3600);
    checks.check("a young file is kept", remove_older_than(&folder, Duration::from_secs(7200), later).ok(), Some(0));
    checks.check("an old file is swept", remove_older_than(&folder, Duration::from_secs(60), later).ok(), Some(1));

    let link_folder = temp.join("link-folder");
    symlink(&temp, &link_folder).expect("a link");
    checks.check("a linked folder is not taken as private", ensure_private_folder(&link_folder).is_err(), true);

    let script = attachments_script(Path::new("/tmp/a\"b"));
    checks.check("the folder reaches the page as a JSON string", script.contains("\"/tmp/a\\\"b\""), true);
}

fn search_paths(checks: &mut Checks) {
    checks.check("folders keep their first place and drop repeats", joined_path(&["/a:/b", "/b:/c", "", ".:bin"]), "/a:/b:/c".to_string());
    checks.check("a relative folder is never searched", find_command(".:bin", "sh"), None);
    checks.check("the path is read after the mark only", path_after_mark("motd line\n__WIDGETARIUM_PATH__/x:/y\n"), "/x:/y");
    checks.check("a shell that printed no mark gives no path", path_after_mark("nothing"), "");
    checks.check("a command is found on the path", find_command("/nope:/bin", "sh"), Some(PathBuf::from("/bin/sh")));
    checks.check("a missing command is not found", find_command("/bin", "no-such-widgetarium-tool"), None);
}

fn turns_stream_and_stop(checks: &mut Checks) {
    let turns = ProcessRuns::new();
    let cwd = scratch("turns");
    let (sink, heard) = recording_sink();
    let argv = vec!["-c".to_string(), "printf 'one\\ntwo\\n'; printf 'bad\\n' >&2; exit 3".into()];
    let launch = ProcessLaunch { binary: Path::new("/bin/sh"), argv: &argv, cwd: &cwd, search_path: "/bin:/usr/bin", env: &[] };
    turns.start(&launch, sink).expect("the turn starts");
    let exited = wait_for_exit(&heard, Duration::from_secs(5));
    checks.check("the exit code reaches the page", exited.map(|event| event["code"].clone()), Some(Value::from(3)));
    let outs: Vec<Value> = heard.lock().unwrap().iter().filter(|event| event["kind"] == "out").map(|event| event["text"].clone()).collect();
    checks.check("stdout streams line by line", outs, vec![Value::from("one\n"), Value::from("two\n")]);
    let errs = heard.lock().unwrap().iter().filter(|event| event["kind"] == "err").count();
    checks.check("stderr streams apart", errs, 1);

    let (sink, heard) = recording_sink();
    let argv = vec!["-c".to_string(), "sleep 30 & wait".into()];
    let launch = ProcessLaunch { binary: Path::new("/bin/sh"), argv: &argv, cwd: &cwd, search_path: "/bin:/usr/bin", env: &[] };
    let turn_id = turns.start(&launch, sink).expect("the long turn starts");
    turns.stop(turn_id);
    let stopped = wait_for_exit(&heard, Duration::from_secs(3));
    checks.check("stop ends the whole process group at once", stopped.map(|event| event["code"].is_null()), Some(true));
    checks.check("a stopped turn is no longer running", turns.is_running(turn_id), false);

    let (sink, heard) = recording_sink();
    let leaving_id = turns.start(&launch, sink).expect("a turn to leave behind starts");
    turns.stop_all();
    let left = wait_for_exit(&heard, Duration::from_secs(3));
    checks.check("leaving the app ends every running turn", left.is_some() && !turns.is_running(leaving_id), true);

    let (sink, heard) = recording_sink();
    let argv = vec!["-c".to_string(), "sleep 30 & echo started".into()];
    let launch = ProcessLaunch { binary: Path::new("/bin/sh"), argv: &argv, cwd: &cwd, search_path: "/bin:/usr/bin", env: &[] };
    turns.start(&launch, sink).expect("a turn that leaves a helper behind starts");
    let exited = wait_for_exit(&heard, Duration::from_secs(3));
    checks.check("a helper holding the pipe does not keep the turn open", exited.map(|event| event["code"].clone()), Some(Value::from(0)));

    let missing = ProcessLaunch { binary: Path::new("/no/such/tool"), argv: &[], cwd: &cwd, search_path: "", env: &[] };
    let (sink, _) = recording_sink();
    checks.check("a binary that cannot start is refused", turns.start(&missing, sink).is_err(), true);
}

fn lent_folders(checks: &mut Checks) {
    let attachments = scratch("lent");
    let assistant = Assistant::new(attachments.clone());
    let picked = scratch("picked-folder");
    let asked = vec![picked.to_string_lossy().into_owned()];
    checks.check("a folder the webview names but nobody picked is refused", commands::checked_folders(&assistant, &asked).is_err(), true);
    let remembered = commands::remember_picked_folder(&assistant, &picked).expect("a picked folder is kept");
    let real = picked.canonicalize().expect("real");
    checks.check("the picked folder answers its real path", remembered, Value::from(real.to_string_lossy().into_owned()));
    checks.check("a picked folder is lent", commands::checked_folders(&assistant, &asked).ok(), Some(vec![real.clone()]));
    let climbing = vec![format!("{}/../{}", picked.display(), "elsewhere")];
    checks.check("a path climbing out of a picked folder is refused", commands::checked_folders(&assistant, &climbing).is_err(), true);
    let file = picked.join("a.txt");
    fs::write(&file, b"x").expect("a file");
    checks.check("a file is never taken as a picked folder", commands::remember_picked_folder(&assistant, &file).is_err(), true);
}

fn dropped_rules(checks: &mut Checks) {
    checks.check("a png up to 10 MB is read", dropped_file_refusal("shot.PNG", LARGEST_IMAGE_BYTES), None);
    checks.check("an image over 10 MB is refused", dropped_file_refusal("shot.webp", LARGEST_IMAGE_BYTES + 1).is_some(), true);
    checks.check("a text file up to 1 MB is read", dropped_file_refusal("notes.md", LARGEST_TEXT_BYTES), None);
    checks.check("a text file over 1 MB is refused", dropped_file_refusal("data.csv", LARGEST_TEXT_BYTES + 1).is_some(), true);
    checks.check("a pdf is refused", dropped_file_refusal("report.pdf", 1).is_some(), true);
    checks.check("a name with no extension is refused", dropped_file_refusal("Makefile", 1).is_some(), true);
}

fn dropped_list(checks: &mut Checks) {
    let assistant = Assistant::new(scratch("drop-attachments"));
    let place = scratch("dropped");
    let (note, folder, secret, big) = (place.join("note.md"), place.join("habits"), place.join("secret.md"), place.join("big.txt"));
    fs::write(&note, b"# hi").expect("a note");
    fs::write(&secret, b"never dropped").expect("a secret");
    fs::write(&big, vec![b'a'; (LARGEST_TEXT_BYTES + 1) as usize]).expect("a big file");
    fs::create_dir_all(&folder).expect("a folder");
    let shown = |path: &Path| path.to_string_lossy().into_owned();
    let asked = vec![shown(&note), shown(&folder), shown(&big), shown(&place.join("gone.md"))];
    let answer = drops::drop_paths(&assistant, &asked);
    let kinds: Vec<(String, String)> = answer
        .as_array()
        .expect("a list")
        .iter()
        .map(|entry| (entry["name"].as_str().unwrap_or("").to_string(), entry["kind"].as_str().unwrap_or("").to_string()))
        .collect();
    let wanted = vec![("note.md".into(), "file".into()), ("habits".into(), "folder".into()), ("big.txt".into(), "file".into())];
    checks.check("a drop answers each existing path as a file or a folder", kinds, wanted);
    let real_folder = folder.canonicalize().expect("real");
    checks.check("a dropped folder is lent like a picked one", assistant.was_picked(&real_folder), true);
    checks.check("a dropped file is read", drops::read_dropped(&assistant, &shown(&note)).ok(), Some(b"# hi".to_vec()));
    checks.check("a file nobody dropped is not read", drops::read_dropped(&assistant, &shown(&secret)).is_err(), true);
    checks.check("a dropped file over its limit is not read", drops::read_dropped(&assistant, &shown(&big)).is_err(), true);
    checks.check("a dropped folder is not read as a file", drops::read_dropped(&assistant, &shown(&folder)).is_err(), true);
    let climbing = format!("{}/../secret.md", folder.display());
    let climbed_note = format!("{}/../note.md", folder.display());
    checks.check("a dropped file named by a climbing path is still the dropped file", drops::read_dropped(&assistant, &climbed_note).is_ok(), true);
    checks.check("a path climbing to a file never dropped is refused", drops::read_dropped(&assistant, &climbing).is_err(), true);
    drops::drop_paths(&assistant, &[shown(&secret)]);
    checks.check("a new drop replaces the last drop's files", drops::read_dropped(&assistant, &shown(&note)).is_err(), true);
    checks.check("the new drop's file is read", drops::read_dropped(&assistant, &shown(&secret)).is_ok(), true);
}

fn main() {
    let mut checks = Checks { failed: 0 };
    dropped_rules(&mut checks);
    dropped_list(&mut checks);
    lent_folders(&mut checks);
    allowlist(&mut checks);
    turn_refusals(&mut checks);
    attachment_paths(&mut checks);
    private_files(&mut checks);
    search_paths(&mut checks);
    turns_stream_and_stop(&mut checks);
    if checks.failed > 0 {
        println!("{} check(s) failed", checks.failed);
        std::process::exit(1);
    }
    println!("all assistant rules hold");
}
