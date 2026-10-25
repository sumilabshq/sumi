use super::webkit::Answer;
use block2::RcBlock;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::MainThreadMarker;
use objc2_app_kit::{NSEvent, NSEventMask, NSEventType, NSWindow};
use objc2_foundation::NSPoint;
use serde_json::Value;
use std::cell::{Cell, RefCell};
use std::ptr::NonNull;
use std::sync::mpsc;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, LogicalSize, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Wry};

const GHOST_LABEL: &str = "tear-off-ghost";
const GHOST_PAGE: &str = "index.html?ghost=1";
static BUILDING: Mutex<()> = Mutex::new(());
const NOT_LAID: &str = "The tear-off ghost has no window yet.";
const LOAD_WAIT: Duration = Duration::from_secs(8);
const OFF_SCREEN: f64 = -20000.0;
const SHOT_AFTER: Duration = Duration::from_millis(400);
const SHOT_NAME: &str = "tear-off-ghost.png";
const GHOST_PLAYER: &str = r#"window.__wgLay = (laid) => {
  document.documentElement.setAttribute("class", laid.htmlClass);
  laid.htmlAttributes.forEach(([name, value]) => document.documentElement.setAttribute(name, value));
  document.body.setAttribute("class", laid.bodyClass);
  document.documentElement.style.setProperty("background", "transparent", "important");
  document.body.style.cssText = "margin:0;background:transparent !important;overflow:hidden";
  document.body.innerHTML = laid.ghost;
};
window.__wgWear = (worn) => {
  Object.entries(worn.styles).forEach(([part, style]) => {
    const element = document.querySelector(`[data-ghost-part="${part}"]`);
    if (element !== null) element.style.cssText = style;
  });
  Object.entries(worn.texts).forEach(([part, text]) => {
    const element = document.querySelector(`[data-ghost-part="${part}"]`);
    if (element !== null) element.textContent = text;
  });
};"#;

pub struct GhostLay {
    pub page: Value,
    pub width: f64,
    pub height: f64,
    pub anchor_x: f64,
    pub anchor_y: f64,
}

struct HeldGhost {
    window: Retained<NSWindow>,
    anchor: (f64, f64),
}

thread_local! {
    static HELD: RefCell<Option<HeldGhost>> = const { RefCell::new(None) };
    static IS_SHOWN: Cell<bool> = const { Cell::new(false) };
    static MONITOR: RefCell<Option<Retained<AnyObject>>> = const { RefCell::new(None) };
}

pub fn lay(app: &AppHandle<Wry>, ghost: GhostLay) -> Answer<Value> {
    let window = ghost_window(app)?;
    window.set_size(LogicalSize::new(ghost.width, ghost.height)).map_err(|failure| failure.to_string())?;
    window.eval(format!("{GHOST_PLAYER}\nwindow.__wgLay({});", ghost.page)).map_err(|failure| failure.to_string())?;
    let pointer = window.ns_window().map_err(|failure| failure.to_string())? as usize;
    let anchor = (ghost.anchor_x, ghost.anchor_y);
    app.run_on_main_thread(move || hold(pointer, anchor)).map_err(|failure| failure.to_string())?;
    eprintln!("[browser] tear-off ghost none → laid ({:.0}×{:.0}, hidden until it would leave the studio)", ghost.width, ghost.height);
    Ok(Value::Null)
}

pub fn wear(app: &AppHandle<Wry>, worn: &Value) -> Answer<Value> {
    let window = app.get_webview_window(GHOST_LABEL).ok_or(NOT_LAID)?;
    window.eval(format!("window.__wgWear && window.__wgWear({worn});")).map_err(|failure| failure.to_string())?;
    Ok(Value::Null)
}

pub fn show(app: &AppHandle<Wry>, is_shown: bool) -> Answer<Value> {
    app.run_on_main_thread(move || show_now(is_shown)).map_err(|failure| failure.to_string())?;

    if cfg!(debug_assertions) && is_shown {
        let shooter = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(SHOT_AFTER);
            let _ = shooter.run_on_main_thread(shoot_ghost);
        });
    }

    Ok(Value::Null)
}

fn shoot_ghost() {
    let number = HELD.with(|held| held.borrow().as_ref().map(|ghost| ghost.window.windowNumber()));
    let Some(number) = number else { return };
    let path = std::env::temp_dir().join(SHOT_NAME);
    let written = super::drive::png_of_window(number as u32).and_then(|png| std::fs::write(&path, png).map_err(|failure| failure.to_string()));

    match written {
        Ok(()) => eprintln!("[browser] tear-off ghost shot → {}", path.display()),
        Err(failure) => eprintln!("[browser] tear-off ghost shot → none ({failure})"),
    }
}

pub fn prepare(app: &AppHandle<Wry>) {
    let preparing = app.clone();
    std::thread::spawn(move || {
        if let Err(failure) = ghost_window(&preparing) {
            eprintln!("[browser] tear-off ghost window none → none (it could not be prepared: {failure})");
        }
    });
}

fn ghost_window(app: &AppHandle<Wry>) -> Answer<WebviewWindow<Wry>> {
    let _building = BUILDING.lock().map_err(|failure| failure.to_string())?;

    if let Some(window) = app.get_webview_window(GHOST_LABEL) {
        return Ok(window);
    }

    let (loaded, load_heard) = mpsc::channel();
    let loaded = Mutex::new(Some(loaded));
    let window = WebviewWindowBuilder::new(app, GHOST_LABEL, WebviewUrl::App(GHOST_PAGE.into()))
        .on_page_load(move |_, payload| {
            if payload.event() == tauri::webview::PageLoadEvent::Finished {
                if let Some(sender) = loaded.lock().ok().and_then(|mut held| held.take()) {
                    let _ = sender.send(());
                }
            }
        })
        .transparent(true)
        .decorations(false)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .focused(false)
        // TRADE-OFF: shown off-screen, not hidden; a hidden WebKit view never loads its page
        .position(OFF_SCREEN, OFF_SCREEN)
        .visible(true)
        .build()
        .map_err(|failure| failure.to_string())?;
    window.set_ignore_cursor_events(true).map_err(|failure| failure.to_string())?;

    match load_heard.recv_timeout(LOAD_WAIT) {
        Ok(()) => eprintln!("[browser] tear-off ghost window none → ready (its page loaded)"),
        Err(_) => eprintln!("[browser] tear-off ghost window none → built (its page did not report loaded in {LOAD_WAIT:?})"),
    }

    Ok(window)
}

fn hold(pointer: usize, anchor: (f64, f64)) {
    let Some(window) = (unsafe { Retained::retain(pointer as *mut NSWindow) }) else { return };
    window.setIgnoresMouseEvents(true);
    HELD.with(|held| held.replace(Some(HeldGhost { window, anchor })));
    MONITOR.with(|monitor| {
        if monitor.borrow().is_none() {
            monitor.replace(installed_monitor());
        }
    });
}

fn show_now(is_shown: bool) {
    if IS_SHOWN.get() == is_shown {
        return;
    }

    IS_SHOWN.set(is_shown);
    HELD.with(|held| {
        let held = held.borrow();
        let Some(ghost) = held.as_ref() else { return };

        if !is_shown {
            ghost.window.orderOut(None);
            return;
        }

        follow_cursor(ghost);
        ghost.window.orderFront(None);
    });
    eprintln!("[browser] tear-off ghost {}", if is_shown { "hidden → shown (it would leave the studio)" } else { "shown → hidden" });
}

fn follow_cursor(ghost: &HeldGhost) {
    let cursor = NSEvent::mouseLocation();
    ghost.window.setFrameTopLeftPoint(NSPoint::new(cursor.x - ghost.anchor.0, cursor.y + ghost.anchor.1));
}

fn installed_monitor() -> Option<Retained<AnyObject>> {
    let heard = RcBlock::new(move |event: NonNull<NSEvent>| -> *mut NSEvent {
        if MainThreadMarker::new().is_some() && IS_SHOWN.get() {
            HELD.with(|held| {
                if let Some(ghost) = held.borrow().as_ref() {
                    follow_cursor(ghost);
                }
            });
        }

        if unsafe { event.as_ref() }.r#type() == NSEventType::LeftMouseUp {
            show_now(false);
        }

        event.as_ptr()
    });
    let mask = NSEventMask::LeftMouseDragged | NSEventMask::LeftMouseUp;
    let monitor = unsafe { NSEvent::addLocalMonitorForEventsMatchingMask_handler(mask, &heard) };

    if monitor.is_none() {
        eprintln!("[browser] tear-off ghost monitor → none (AppKit refused it; the ghost will not follow the cursor)");
    }

    monitor
}
