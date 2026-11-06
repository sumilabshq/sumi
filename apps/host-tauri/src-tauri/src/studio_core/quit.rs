use objc2::runtime::{AnyClass, AnyObject, Bool, Imp, Sel};
use objc2::{ffi, msg_send, sel};
use std::collections::HashSet;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter, EventTarget, Manager, RunEvent, Runtime};

pub const FLUSH_BEFORE_QUIT_EVENT: &str = "studio-flush-before-quit";

const MOST_FLUSH_WAIT: Duration = Duration::from_secs(3);
const TERMINATE_NOW: usize = 1;
const TERMINATE_LATER: usize = 2;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum QuitEnd {
    ReplyToMacOs,
    Exit,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum QuitStart {
    Now,
    Waiting,
    AlreadyWaiting,
}

struct Pending {
    waiting: HashSet<String>,
    end: QuitEnd,
}

#[derive(Default)]
struct QuitState {
    listening: HashSet<String>,
    pending: Option<Pending>,
    is_done: bool,
}

#[derive(Default)]
pub struct QuitFlushes {
    state: Mutex<QuitState>,
}

impl QuitFlushes {
    fn held(&self) -> std::sync::MutexGuard<'_, QuitState> {
        self.state.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn listening(&self, label: &str) {
        self.held().listening.insert(label.to_owned());
    }

    pub fn gone(&self, label: &str) {
        self.held().listening.remove(label);
    }

    pub fn is_done(&self) -> bool {
        self.held().is_done
    }

    pub fn start(&self, live: &[String], end: QuitEnd) -> QuitStart {
        let mut state = self.held();
        if state.is_done {
            return QuitStart::Now;
        }

        if state.pending.is_some() {
            return QuitStart::AlreadyWaiting;
        }

        let waiting: HashSet<String> = live.iter().filter(|label| state.listening.contains(*label)).cloned().collect();
        if waiting.is_empty() {
            state.is_done = true;
            return QuitStart::Now;
        }

        state.pending = Some(Pending { waiting, end });
        QuitStart::Waiting
    }

    pub fn waiting_for(&self) -> Vec<String> {
        let mut labels: Vec<String> = self.held().pending.as_ref().map(|pending| pending.waiting.iter().cloned().collect()).unwrap_or_default();
        labels.sort();
        labels
    }

    pub fn heard(&self, label: &str) -> Option<QuitEnd> {
        let mut state = self.held();
        let pending = state.pending.as_mut()?;
        pending.waiting.remove(label);
        if !pending.waiting.is_empty() {
            return None;
        }

        state.finish()
    }

    pub fn give_up(&self) -> Option<QuitEnd> {
        self.held().finish()
    }
}

impl QuitState {
    fn finish(&mut self) -> Option<QuitEnd> {
        let end = self.pending.take()?.end;
        self.is_done = true;
        Some(end)
    }
}

type ShouldTerminate = Box<dyn Fn() -> usize + Send + Sync>;

static SHOULD_TERMINATE: OnceLock<ShouldTerminate> = OnceLock::new();

unsafe extern "C-unwind" fn application_should_terminate(_this: &AnyObject, _cmd: Sel, _sender: *mut AnyObject) -> usize {
    SHOULD_TERMINATE.get().map_or(TERMINATE_NOW, |asked| asked())
}

pub fn ask_macos_before_terminating<R: Runtime>(app: &AppHandle<R>) {
    let app = app.clone();
    let _ = SHOULD_TERMINATE.set(Box::new(move || match ask_to_quit(&app, QuitEnd::ReplyToMacOs) {
        QuitStart::Now => TERMINATE_NOW,
        QuitStart::Waiting | QuitStart::AlreadyWaiting => TERMINATE_LATER,
    }));
    let Some(ns_application) = AnyClass::get(c"NSApplication") else {
        eprintln!("[studio-core] quit → no NSApplication, macOS quits without asking the windows to save");
        return;
    };
    let shared: *mut AnyObject = unsafe { msg_send![ns_application, sharedApplication] };
    let delegate: *mut AnyObject = unsafe { msg_send![shared, delegate] };
    let Some(delegate) = (unsafe { delegate.as_ref() }) else {
        eprintln!("[studio-core] quit → the app has no delegate yet, macOS quits without asking the windows to save");
        return;
    };
    let class: &AnyClass = delegate.class();
    let ours: Imp = unsafe { std::mem::transmute::<unsafe extern "C-unwind" fn(&AnyObject, Sel, *mut AnyObject) -> usize, Imp>(application_should_terminate) };
    let added = unsafe { ffi::class_addMethod(class as *const AnyClass as *mut AnyClass, sel!(applicationShouldTerminate:), ours, c"Q@:@".as_ptr()) };
    let said = if added.as_bool() { "asks the windows to save first" } else { "already had applicationShouldTerminate, left alone" };
    eprintln!("[studio-core] quit through macOS ({}) → {said}", class.name().to_string_lossy());
}

pub fn follow_exit_request<R: Runtime>(app: &AppHandle<R>, event: &RunEvent) {
    let RunEvent::ExitRequested { api, code, .. } = event else {
        return;
    };

    if ask_to_quit(app, QuitEnd::Exit) == QuitStart::Now {
        eprintln!("[studio-core] exit {code:?} asked → nothing left to save, exits");
        return;
    }

    api.prevent_exit();
}

pub fn ask_to_quit<R: Runtime>(app: &AppHandle<R>, end: QuitEnd) -> QuitStart {
    let flushes = app.state::<Arc<QuitFlushes>>().inner().clone();
    let started = flushes.start(&super::live_studio_windows(app), end);
    if started != QuitStart::Waiting {
        return started;
    }

    let waiting = flushes.waiting_for();
    eprintln!("[studio-core] quit asked ({end:?}) → waiting for {waiting:?} to save");
    if let Err(failure) = app.emit_filter(FLUSH_BEFORE_QUIT_EVENT, (), |target| is_one_of(target, &waiting)) {
        eprintln!("[studio-core] quit asked → windows not told to save: {failure}");
    }

    let app = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(MOST_FLUSH_WAIT);
        if let Some(end) = flushes.give_up() {
            eprintln!("[studio-core] quit waited {MOST_FLUSH_WAIT:?} for {:?} → quits with saves still pending", flushes.waiting_for());
            end_quit(&app, end);
        }
    });
    QuitStart::Waiting
}

pub fn heard_flushed<R: Runtime>(app: &AppHandle<R>, label: &str, is_saved: bool) {
    if !is_saved {
        eprintln!("[studio-core] window {label} could not save everything before quitting, see its log");
    }

    let flushes = app.state::<Arc<QuitFlushes>>().inner().clone();
    if let Some(end) = flushes.heard(label) {
        eprintln!("[studio-core] window {label} answered → every window answered, the app quits");
        end_quit(app, end);
    }
}

fn end_quit<R: Runtime>(app: &AppHandle<R>, end: QuitEnd) {
    match end {
        QuitEnd::Exit => app.exit(0),
        QuitEnd::ReplyToMacOs => {
            let replied = app.run_on_main_thread(|| {
                let Some(ns_application) = AnyClass::get(c"NSApplication") else {
                    return;
                };
                let shared: *mut AnyObject = unsafe { msg_send![ns_application, sharedApplication] };
                let _: () = unsafe { msg_send![shared, replyToApplicationShouldTerminate: Bool::YES] };
            });
            if let Err(failure) = replied {
                eprintln!("[studio-core] quit → macOS was not answered, exits instead: {failure}");
                app.exit(0);
            }
        }
    }
}

fn is_one_of(target: &EventTarget, windows: &[String]) -> bool {
    match target {
        EventTarget::Window { label }
        | EventTarget::Webview { label }
        | EventTarget::WebviewWindow { label }
        | EventTarget::AnyLabel { label } => windows.iter().any(|open| open == label),
        _ => false,
    }
}
