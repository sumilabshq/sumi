use super::pages::Pages;
use objc2_core_graphics::{CGEventSource, CGEventSourceStateID, CGMouseButton};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager, PhysicalPosition, Wry};

const POLL: Duration = Duration::from_millis(16);
const MAIN_WINDOW: &str = "main";
const GRAB_TOP_PX: f64 = 20.0;

pub struct TearOff {
    watch: AtomicU64,
}

pub struct TornPage {
    pub page_id: String,
    pub title: String,
}

impl TearOff {
    pub fn new() -> Self {
        TearOff { watch: AtomicU64::new(0) }
    }

    pub fn stop(&self) {
        self.watch.fetch_add(1, Ordering::SeqCst);
    }

    pub fn watch(self: &Arc<Self>, pages: &Arc<Pages>, app: &AppHandle<Wry>, page: TornPage) {
        let watch = self.watch.fetch_add(1, Ordering::SeqCst) + 1;
        let tear_off = self.clone();
        let pages = pages.clone();
        let app = app.clone();
        thread::spawn(move || tear_off.follow(watch, &pages, &app, &page));
    }

    fn is_current(&self, watch: u64) -> bool {
        self.watch.load(Ordering::SeqCst) == watch
    }

    fn follow(&self, watch: u64, pages: &Arc<Pages>, app: &AppHandle<Wry>, page: &TornPage) {
        eprintln!("[browser] page {} lifted → watching the cursor for the studio edge", page.page_id);

        if !self.waits_to_leave(watch, app) {
            eprintln!("[browser] page {} stays in the studio (released inside it)", page.page_id);
            return;
        }

        eprintln!("[browser] page {} studio → own window (dragged out of the studio)", page.page_id);

        if let Err(failure) = pages.open_own_window(app, &page.page_id, &page.title) {
            eprintln!("[browser] page {} could not leave the studio: {failure}", page.page_id);
            return;
        }

        while self.is_current(watch) && is_mouse_down() {
            move_under_cursor(pages, app, &page.page_id);
            thread::sleep(POLL);
        }
    }

    fn waits_to_leave(&self, watch: u64, app: &AppHandle<Wry>) -> bool {
        loop {
            thread::sleep(POLL);

            if !self.is_current(watch) || !is_mouse_down() {
                return false;
            }

            if is_outside_studio(app) {
                return true;
            }
        }
    }
}

fn is_mouse_down() -> bool {
    CGEventSource::button_state(CGEventSourceStateID::CombinedSessionState, CGMouseButton::Left)
}

fn is_outside_studio(app: &AppHandle<Wry>) -> bool {
    let Some(main) = app.get_window(MAIN_WINDOW) else { return false };
    let (Ok(at), Ok(size), Ok(cursor)) = (main.outer_position(), main.outer_size(), app.cursor_position()) else { return false };
    let frame = Frame { left: f64::from(at.x), top: f64::from(at.y), width: f64::from(size.width), height: f64::from(size.height) };
    is_outside(&frame, cursor.x, cursor.y)
}

pub struct Frame {
    pub left: f64,
    pub top: f64,
    pub width: f64,
    pub height: f64,
}

pub fn is_outside(frame: &Frame, x: f64, y: f64) -> bool {
    x < frame.left || y < frame.top || x > frame.left + frame.width || y > frame.top + frame.height
}

fn move_under_cursor(pages: &Pages, app: &AppHandle<Wry>, page_id: &str) {
    let Some(window) = pages.own_window_label(page_id).and_then(|label| app.get_window(&label)) else { return };
    let (Ok(size), Ok(scale), Ok(cursor)) = (window.outer_size(), window.scale_factor(), app.cursor_position()) else { return };
    let x = cursor.x - f64::from(size.width) / 2.0;
    let y = cursor.y - GRAB_TOP_PX * scale;

    if let Err(failure) = window.set_position(PhysicalPosition::new(x, y)) {
        eprintln!("[browser] own window of {page_id} could not follow the cursor: {failure}");
    }
}
