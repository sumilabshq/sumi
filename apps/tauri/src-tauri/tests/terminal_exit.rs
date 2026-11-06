use serde_json::{json, Value};
use std::process::{Child, Command, ExitCode};
use std::time::{Duration, Instant};
use widgetarium_host_tauri_lib::terminal::{exit_message, output_message, settled_code};

const SHORT_WAIT: Duration = Duration::from_millis(300);
const LONG_WAIT: Duration = Duration::from_secs(5);

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

fn shell(script: &str) -> Child {
    Command::new("/bin/sh").arg("-c").arg(script).spawn().expect("/bin/sh starts")
}

fn code_of(child: &mut Child, wait: Duration) -> Option<i32> {
    settled_code(|| child.try_wait().ok(), wait)
}

fn main() -> ExitCode {
    let mut checks = Checks { failed: 0 };

    checks.check("output stays a plain byte array", output_message(&[104, 105]), json!([104, 105]));
    checks.check("an exit is its own message, carrying the code", exit_message(Some(3)), json!({ "exit": 3 }));
    checks.check("an exit with no code carries null", exit_message(None), json!({ "exit": Value::Null }));

    let mut exited = shell("exit 3");
    checks.check("a shell that exits 3 reports 3", code_of(&mut exited, LONG_WAIT), Some(3));

    let mut killed = shell("sleep 30");
    let _ = killed.kill();
    checks.check("a shell killed by a signal reports no code", code_of(&mut killed, LONG_WAIT), None);

    let mut running = shell("sleep 30");
    let started = Instant::now();
    let code = code_of(&mut running, SHORT_WAIT);
    let waited = started.elapsed();
    let _ = running.kill();
    let _ = running.wait();
    checks.check("a shell still running past the wait reports no code", code, None);
    checks.check("and the wait is bounded", waited < SHORT_WAIT * 3, true);

    checks.check("a session already gone reports no code", settled_code(|| None, LONG_WAIT), None);

    if checks.failed > 0 {
        println!("terminal exit: {} check(s) failed", checks.failed);
        return ExitCode::FAILURE;
    }

    println!("terminal exit: all checks passed");
    ExitCode::SUCCESS
}
