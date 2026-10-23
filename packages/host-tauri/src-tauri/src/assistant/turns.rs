use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read};
use std::os::unix::process::CommandExt;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

const HARD_STOP_AFTER: Duration = Duration::from_secs(5);
const OWN_PROCESS_GROUP: i32 = 0;
const GRACE_ON_QUIT: Duration = Duration::from_millis(300);
const NOT_STARTED: &str = "{command} could not be started: {why}";

pub type TurnSink = Arc<dyn Fn(Value) + Send + Sync>;

type RunningGroups = Arc<Mutex<HashMap<u64, u32>>>;

pub struct TurnLaunch<'a> {
    pub binary: &'a Path,
    pub argv: &'a [String],
    pub cwd: &'a Path,
    pub search_path: &'a str,
}

pub fn out_event(text: String) -> Value {
    json!({ "kind": "out", "text": text })
}

pub fn err_event(text: String) -> Value {
    json!({ "kind": "err", "text": text })
}

pub fn exited_event(code: Option<i32>) -> Value {
    json!({ "kind": "exited", "code": code })
}

pub struct Turns {
    next_id: AtomicU64,
    running: RunningGroups,
}

impl Turns {
    pub fn new() -> Self {
        Turns { next_id: AtomicU64::new(0), running: Arc::new(Mutex::new(HashMap::new())) }
    }

    pub fn start(&self, launch: &TurnLaunch, sink: TurnSink) -> Result<u64, String> {
        let mut child = spawn_in_own_group(launch).map_err(|why| not_started(launch.binary, &why))?;
        let turn_id = self.next_id.fetch_add(1, Ordering::Relaxed) + 1;
        lock(&self.running).insert(turn_id, child.id());
        let readers = [
            stream_lines(child.stdout.take(), sink.clone(), out_event),
            stream_lines(child.stderr.take(), sink.clone(), err_event),
        ];
        let running = self.running.clone();
        thread::spawn(move || watch_exit(ExitWatch { child, readers, running, turn_id, sink }));
        Ok(turn_id)
    }

    pub fn stop(&self, turn_id: u64) {
        let Some(group) = self.group_of(turn_id) else {
            return;
        };
        signal_group(group, libc::SIGTERM);
        let running = self.running.clone();
        thread::spawn(move || {
            thread::sleep(HARD_STOP_AFTER);
            if lock(&running).get(&turn_id) == Some(&group) {
                signal_group(group, libc::SIGKILL);
            }
        });
    }

    pub fn stop_all(&self) {
        let groups: Vec<u32> = lock(&self.running).values().copied().collect();
        groups.iter().for_each(|group| signal_group(*group, libc::SIGTERM));
        thread::sleep(GRACE_ON_QUIT);
        groups.iter().for_each(|group| signal_group(*group, libc::SIGKILL));
    }

    pub fn is_running(&self, turn_id: u64) -> bool {
        self.group_of(turn_id).is_some()
    }

    fn group_of(&self, turn_id: u64) -> Option<u32> {
        lock(&self.running).get(&turn_id).copied()
    }
}

struct ExitWatch {
    child: Child,
    readers: [Option<thread::JoinHandle<()>>; 2],
    running: RunningGroups,
    turn_id: u64,
    sink: TurnSink,
}

// TRADE-OFF: helpers the CLI started may still hold its pipes after it exits, so the whole group is ended before the pipes are drained rather than waiting on them
fn watch_exit(mut watch: ExitWatch) {
    let code = watch.child.wait().ok().and_then(|status| status.code());
    signal_group(watch.child.id(), libc::SIGTERM);
    watch.readers.into_iter().flatten().for_each(|reader| drop(reader.join()));
    lock(&watch.running).remove(&watch.turn_id);
    (watch.sink)(exited_event(code));
}

fn lock(running: &RunningGroups) -> std::sync::MutexGuard<'_, HashMap<u64, u32>> {
    running.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn not_started(binary: &Path, why: &std::io::Error) -> String {
    NOT_STARTED.replace("{command}", &binary.to_string_lossy()).replace("{why}", &why.to_string())
}

fn spawn_in_own_group(launch: &TurnLaunch) -> std::io::Result<Child> {
    Command::new(launch.binary)
        .args(launch.argv)
        .current_dir(launch.cwd)
        .env("PATH", launch.search_path)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .process_group(OWN_PROCESS_GROUP)
        .spawn()
}

fn stream_lines<P: Read + Send + 'static>(
    pipe: Option<P>,
    sink: TurnSink,
    event_of: fn(String) -> Value,
) -> Option<thread::JoinHandle<()>> {
    let pipe = pipe?;
    Some(thread::spawn(move || {
        let mut reader = BufReader::new(pipe);
        let mut line = Vec::new();
        while reader.read_until(b'\n', &mut line).unwrap_or(0) > 0 {
            sink(event_of(String::from_utf8_lossy(&line).into_owned()));
            line.clear();
        }
    }))
}

fn signal_group(group: u32, signal: i32) {
    let Ok(group) = i32::try_from(group) else {
        return;
    };
    if group > 0 {
        unsafe { libc::killpg(group, signal) };
    }
}
