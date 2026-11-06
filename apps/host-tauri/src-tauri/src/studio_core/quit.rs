use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::menu::{Menu, MenuEvent, MenuItem, MenuItemKind};
use tauri::{AppHandle, Emitter, EventTarget, Manager, Runtime};

pub const QUIT_MENU_ID: &str = "ink-quit";
pub const FLUSH_BEFORE_QUIT_EVENT: &str = "studio-flush-before-quit";

const QUIT_LABEL: &str = "Quit";
const QUIT_KEYS: &str = "CmdOrCtrl+Q";
const MOST_FLUSH_WAIT: Duration = Duration::from_secs(3);

#[derive(Default)]
pub struct QuitFlushes {
    waiting: Mutex<Option<HashSet<String>>>,
}

impl QuitFlushes {
    pub fn start(&self, windows: &[String]) -> bool {
        let mut waiting = self.waiting.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        if waiting.is_some() {
            return false;
        }

        waiting.replace(windows.iter().cloned().collect());
        true
    }

    pub fn heard(&self, label: &str) -> bool {
        let mut waiting = self.waiting.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let Some(left) = waiting.as_mut() else {
            return false;
        };
        left.remove(label);
        left.is_empty()
    }
}

pub fn wear_quit_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let menu = Menu::default(app)?;
    if let Some(MenuItemKind::Submenu(app_menu)) = menu.items()?.into_iter().next() {
        let count = app_menu.items()?.len();
        if count > 0 {
            app_menu.remove_at(count - 1)?;
        }
        app_menu.append(&MenuItem::with_id(app, QUIT_MENU_ID, QUIT_LABEL, true, Some(QUIT_KEYS))?)?;
    }
    app.set_menu(menu)?;
    app.on_menu_event(follow_quit_menu);
    Ok(())
}

fn follow_quit_menu<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    if event.id() != QUIT_MENU_ID {
        return;
    }

    quit_after_flush(app, super::live_studio_windows(app));
}

pub fn quit_after_flush<R: Runtime>(app: &AppHandle<R>, windows: Vec<String>) {
    let flushes = app.state::<Arc<QuitFlushes>>().inner().clone();
    if !flushes.start(&windows) {
        return;
    }

    if windows.is_empty() {
        app.exit(0);
        return;
    }

    eprintln!("[studio-core] quit asked → waiting for {} window(s) to save", windows.len());
    if let Err(failure) = app.emit_filter(FLUSH_BEFORE_QUIT_EVENT, (), |target| is_one_of(target, &windows)) {
        eprintln!("[studio-core] quit asked → windows not told to save, quitting: {failure}");
        app.exit(0);
        return;
    }

    let app = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(MOST_FLUSH_WAIT);
        eprintln!("[studio-core] quit waited {MOST_FLUSH_WAIT:?} → quits with saves still pending");
        app.exit(0);
    });
}

pub fn heard_flushed<R: Runtime>(app: &AppHandle<R>, label: &str) {
    let flushes = app.state::<Arc<QuitFlushes>>().inner().clone();
    if flushes.heard(label) {
        eprintln!("[studio-core] window {label} saved → every window saved, the app quits");
        app.exit(0);
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
