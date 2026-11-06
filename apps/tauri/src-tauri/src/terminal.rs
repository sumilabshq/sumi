use super::studio_caller::refuse_foreign_caller;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, RawFd};
use std::os::unix::process::CommandExt;
use std::process::{Child, Command, ExitStatus, Stdio};
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::ipc::{Channel, Invoke, InvokeBody, InvokeError, InvokeMessage, JavaScriptChannelId};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::Wry;

pub const PLUGIN_NAME: &str = "terminal";

const DEFAULT_SHELL: &str = "/bin/zsh";
const DEFAULT_LANG: &str = "en_US.UTF-8";
const NO_SESSION: &str = "This terminal is closed.";
const NOT_A_CHANNEL: &str = "onData must be a channel.";
const MISSING_ARGUMENT: &str = "The terminal call is missing {name}.";
const UNKNOWN_COMMAND: &str = "The terminal has no command {name}.";
const CELLS_OUT_OF_RANGE: &str = "The terminal's {name} must be 1 to 1000, not {asked}.";
const MOST_CELLS: u16 = 1000;
const READ_CHUNK_BYTES: usize = 16 * 1024;
const EXIT_WAIT: Duration = Duration::from_secs(2);
const EXIT_POLL: Duration = Duration::from_millis(20);

struct Session {
    master: File,
    child: Child,
}

static SESSIONS: OnceLock<Mutex<HashMap<u64, Session>>> = OnceLock::new();
static NEXT_ID: AtomicU64 = AtomicU64::new(1);

fn sessions() -> &'static Mutex<HashMap<u64, Session>> {
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn argument<'a>(message: &'a InvokeMessage<Wry>, name: &str) -> Result<&'a Value, String> {
    let InvokeBody::Json(args) = message.payload() else { return Err(MISSING_ARGUMENT.replace("{name}", name)) };
    args.get(name).ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name))
}

fn number_of(message: &InvokeMessage<Wry>, name: &str) -> Result<u64, String> {
    argument(message, name)?.as_u64().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name))
}

fn cells_of(message: &InvokeMessage<Wry>) -> Result<libc::winsize, String> {
    Ok(libc::winsize {
        ws_row: cell_count_of(message, "rows")?,
        ws_col: cell_count_of(message, "cols")?,
        ws_xpixel: 0,
        ws_ypixel: 0,
    })
}

fn cell_count_of(message: &InvokeMessage<Wry>, name: &str) -> Result<u16, String> {
    let asked = number_of(message, name)?;
    u16::try_from(asked)
        .ok()
        .filter(|count| (1..=MOST_CELLS).contains(count))
        .ok_or_else(|| CELLS_OUT_OF_RANGE.replace("{name}", name).replace("{asked}", &asked.to_string()))
}

fn opened_pty(size: &libc::winsize) -> Result<(RawFd, RawFd), String> {
    let mut master: RawFd = 0;
    let mut slave: RawFd = 0;
    let mut cells = *size;
    let opened =
        unsafe { libc::openpty(&mut master, &mut slave, std::ptr::null_mut(), std::ptr::null_mut(), &mut cells) };

    if opened != 0 {
        return Err(format!("openpty failed: {}", std::io::Error::last_os_error()));
    }

    Ok((master, slave))
}

fn stdio_of(slave: RawFd) -> Result<Stdio, String> {
    let copy = unsafe { libc::dup(slave) };

    if copy < 0 {
        return Err(format!("dup failed: {}", std::io::Error::last_os_error()));
    }

    Ok(unsafe { Stdio::from_raw_fd(copy) })
}

fn spawned_shell(slave: RawFd) -> Result<Child, String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| DEFAULT_SHELL.to_owned());
    let home = std::env::var("HOME").unwrap_or_else(|_| "/".to_owned());
    let mut command = Command::new(&shell);
    command
        .arg("-l")
        .current_dir(home)
        .env("TERM", "xterm-256color")
        .env("COLORTERM", "truecolor")
        .env("LANG", std::env::var("LANG").unwrap_or_else(|_| DEFAULT_LANG.to_owned()))
        .stdin(stdio_of(slave)?)
        .stdout(stdio_of(slave)?)
        .stderr(stdio_of(slave)?);
    unsafe {
        command.pre_exec(|| {
            if libc::setsid() < 0 || libc::ioctl(0, libc::TIOCSCTTY as _, 0) < 0 {
                return Err(std::io::Error::last_os_error());
            }

            Ok(())
        });
    }
    command.spawn().map_err(|error| format!("{shell} did not start: {error}"))
}

pub fn output_message(bytes: &[u8]) -> Value {
    Value::from(bytes.to_vec())
}

pub fn exit_message(code: Option<i32>) -> Value {
    json!({ "exit": code })
}

pub fn settled_code(mut try_wait: impl FnMut() -> Option<Option<ExitStatus>>, wait: Duration) -> Option<i32> {
    let deadline = Instant::now() + wait;

    loop {
        if let Some(status) = try_wait()? {
            return status.code();
        }

        if Instant::now() >= deadline {
            return None;
        }

        std::thread::sleep(EXIT_POLL);
    }
}

fn exit_code_of(id: u64) -> Option<i32> {
    settled_code(
        || {
            let mut held = sessions().lock().ok()?;
            held.get_mut(&id)?.child.try_wait().ok()
        },
        EXIT_WAIT,
    )
}

fn pipe_output(id: u64, mut reader: File, on_data: Channel<Value>) {
    std::thread::spawn(move || {
        let mut buffer = [0u8; READ_CHUNK_BYTES];

        loop {
            match reader.read(&mut buffer) {
                Ok(0) | Err(_) => break,
                Ok(read) => {
                    if on_data.send(output_message(&buffer[..read])).is_err() {
                        break;
                    }
                }
            }
        }

        let code = exit_code_of(id);
        eprintln!("[terminal] session {id} exited with {code:?}");
        let _ = on_data.send(exit_message(code));
    });
}

fn open(message: &InvokeMessage<Wry>) -> Result<Value, String> {
    let named = argument(message, "onData")?.as_str().ok_or(NOT_A_CHANNEL)?;
    let channel_id = JavaScriptChannelId::from_str(named).map_err(|_| NOT_A_CHANNEL.to_string())?;
    let on_data: Channel<Value> = channel_id.channel_on(message.webview());
    let size = cells_of(message)?;
    let (master, slave) = opened_pty(&size)?;
    let child = spawned_shell(slave);
    unsafe { libc::close(slave) };
    let master_file = unsafe { File::from_raw_fd(master) };
    let child = child?;
    let reader = master_file.try_clone().map_err(|error| error.to_string())?;
    let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
    sessions().lock().map_err(|error| error.to_string())?.insert(id, Session { master: master_file, child });
    pipe_output(id, reader, on_data);
    eprintln!("[terminal] session {id} opened ({}×{})", size.ws_col, size.ws_row);
    Ok(Value::from(id))
}

fn write(message: &InvokeMessage<Wry>) -> Result<Value, String> {
    let id = number_of(message, "id")?;
    let data = argument(message, "data")?.as_str().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", "data"))?;
    let mut held = sessions().lock().map_err(|error| error.to_string())?;
    let session = held.get_mut(&id).ok_or(NO_SESSION)?;
    session.master.write_all(data.as_bytes()).map_err(|error| error.to_string())?;
    Ok(Value::Null)
}

fn resize(message: &InvokeMessage<Wry>) -> Result<Value, String> {
    let id = number_of(message, "id")?;
    let size = cells_of(message)?;
    let held = sessions().lock().map_err(|error| error.to_string())?;
    let session = held.get(&id).ok_or(NO_SESSION)?;

    if unsafe { libc::ioctl(session.master.as_raw_fd(), libc::TIOCSWINSZ as _, &size) } < 0 {
        return Err(format!("resize failed: {}", std::io::Error::last_os_error()));
    }

    Ok(Value::Null)
}

fn close(message: &InvokeMessage<Wry>) -> Result<Value, String> {
    let id = number_of(message, "id")?;
    let removed = sessions().lock().map_err(|error| error.to_string())?.remove(&id);
    let Some(mut session) = removed else { return Ok(Value::Null) };
    let _ = session.child.kill();
    let _ = session.child.wait();
    eprintln!("[terminal] session {id} closed");
    Ok(Value::Null)
}

fn answered(invoke: &Invoke<Wry>) -> Result<Value, String> {
    let message = &invoke.message;
    refuse_foreign_caller(message.webview().label())?;

    match message.command() {
        "open" => open(message),
        "write" => write(message),
        "resize" => resize(message),
        "close" => close(message),
        other => Err(UNKNOWN_COMMAND.replace("{name}", other)),
    }
}

pub fn init() -> TauriPlugin<Wry> {
    Builder::new(PLUGIN_NAME)
        .invoke_handler(|invoke| {
            let answer = answered(&invoke);
            invoke.resolver.respond(answer.map_err(InvokeError::from));
            true
        })
        .build()
}
