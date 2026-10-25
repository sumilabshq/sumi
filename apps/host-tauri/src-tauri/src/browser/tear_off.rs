use super::policy;
use crate::studio_caller::is_studio_label;
use serde_json::{json, Value};
use std::sync::Mutex;
use tauri::{AppHandle, LogicalPosition, Manager, Monitor, TitleBarStyle, WebviewUrl, WebviewWindowBuilder, Window, Wry};

const MAIN_WINDOW: &str = "main";
const NO_STUDIO: &str = "The studio window is not open, so a dragged tab has no window to leave.";
const NO_SCREEN: &str = "No screen holds the cursor, so a torn-off window has nowhere to stand.";
const NO_STUDIO_WINDOW: &str = "No studio window is called \"{window}\".";
const STUDIO_TITLE: &str = "Widgetarium";
const STUDIO_URL: &str = "index.html?window={window}&tab={tab}";
const CHAT_WINDOW_URL: &str = "index.html?window={window}&chat={chat}";
const STUDIO_MIN_WIDTH: f64 = 360.0;
const STUDIO_MIN_HEIGHT: f64 = 560.0;
const TRAFFIC_LIGHTS_AT: LogicalPosition<f64> = LogicalPosition { x: 16.0, y: 32.0 };
pub const STUDIO_WINDOW: TornWindow = TornWindow { width: 1100.0, height: 760.0, grab_top: 20.0 };
static OPENING_STUDIO_WINDOW: Mutex<()> = Mutex::new(());

pub struct Frame {
    pub left: f64,
    pub top: f64,
    pub width: f64,
    pub height: f64,
}

pub struct TornWindow {
    pub width: f64,
    pub height: f64,
    pub grab_top: f64,
}

pub struct OwnWindowAsk<'a> {
    pub studio: &'a Frame,
    pub screen: &'a Frame,
    pub cursor: (f64, f64),
    pub window: &'a TornWindow,
}

pub fn is_outside(frame: &Frame, x: f64, y: f64) -> bool {
    x < frame.left || y < frame.top || x > frame.left + frame.width || y > frame.top + frame.height
}

pub fn own_window_spot(ask: &OwnWindowAsk) -> Option<(f64, f64)> {
    let (x, y) = ask.cursor;

    if !is_outside(ask.studio, x, y) {
        return None;
    }

    Some(window_spot(ask.screen, ask.cursor, ask.window))
}

pub fn window_spot(screen: &Frame, cursor: (f64, f64), window: &TornWindow) -> (f64, f64) {
    let (x, y) = cursor;
    let left = kept_between(x - window.width / 2.0, screen.left, screen.left + screen.width - window.width);
    let top = kept_between(y - window.grab_top, screen.top, screen.top + screen.height - window.height);
    (left, top)
}

fn kept_between(value: f64, lowest: f64, highest: f64) -> f64 {
    value.min(highest).max(lowest)
}

pub fn origin_at_cursor(app: &AppHandle<Wry>, window: &TornWindow) -> Result<Option<LogicalPosition<f64>>, String> {
    let main = app.get_window(MAIN_WINDOW).ok_or(NO_STUDIO)?;
    let cursor = app.cursor_position().map_err(|failure| failure.to_string())?;
    let monitor = screen_under(app, &main, cursor.x, cursor.y).ok_or(NO_SCREEN)?;
    let scale = monitor.scale_factor();
    let physical = TornWindow { width: window.width * scale, height: window.height * scale, grab_top: window.grab_top * scale };
    let ask = OwnWindowAsk { studio: &frame_of(&main)?, screen: &work_area_of(&monitor), cursor: (cursor.x, cursor.y), window: &physical };
    Ok(own_window_spot(&ask).map(|(x, y)| LogicalPosition::new(x / scale, y / scale)))
}

fn screen_under(app: &AppHandle<Wry>, main: &Window<Wry>, x: f64, y: f64) -> Option<Monitor> {
    app.monitor_from_point(x, y).ok().flatten().or_else(|| main.current_monitor().ok().flatten())
}

fn frame_of(window: &Window<Wry>) -> Result<Frame, String> {
    let at = window.outer_position().map_err(|failure| failure.to_string())?;
    let size = window.outer_size().map_err(|failure| failure.to_string())?;
    Ok(Frame { left: f64::from(at.x), top: f64::from(at.y), width: f64::from(size.width), height: f64::from(size.height) })
}

fn work_area_of(monitor: &Monitor) -> Frame {
    let area = monitor.work_area();
    Frame {
        left: f64::from(area.position.x),
        top: f64::from(area.position.y),
        width: f64::from(area.size.width),
        height: f64::from(area.size.height),
    }
}

fn logical_work_area_of(monitor: &Monitor) -> Frame {
    let scale = monitor.scale_factor();
    let area = work_area_of(monitor);
    Frame { left: area.left / scale, top: area.top / scale, width: area.width / scale, height: area.height / scale }
}

fn screen_holding(app: &AppHandle<Wry>, at: (f64, f64)) -> Option<Monitor> {
    let holds = |monitor: &Monitor| !is_outside(&logical_work_area_of(monitor), at.0, at.1);
    let monitors = app.available_monitors().unwrap_or_default();
    monitors.into_iter().find(holds).or_else(|| app.primary_monitor().ok().flatten())
}

fn cursor_on_screen(app: &AppHandle<Wry>) -> Result<(Monitor, (f64, f64)), String> {
    let cursor = app.cursor_position().map_err(|failure| failure.to_string())?;
    let under = app.monitor_from_point(cursor.x, cursor.y).ok().flatten();
    let monitor = under.or_else(|| app.primary_monitor().ok().flatten()).ok_or(NO_SCREEN)?;
    let scale = monitor.scale_factor();
    Ok((monitor, (cursor.x / scale, cursor.y / scale)))
}

fn studio_window_origin(app: &AppHandle<Wry>, at: Option<(f64, f64)>) -> Result<LogicalPosition<f64>, String> {
    let (monitor, cursor) = match at {
        Some(at) => (screen_holding(app, at).ok_or(NO_SCREEN)?, at),
        None => cursor_on_screen(app)?,
    };
    let (x, y) = window_spot(&logical_work_area_of(&monitor), cursor, &STUDIO_WINDOW);
    Ok(LogicalPosition::new(x, y))
}

pub fn open_studio_window(app: &AppHandle<Wry>, tab: &str, at: Option<(f64, f64)>) -> Result<Value, String> {
    policy::label_of(tab)?;
    let label = open_window_with(app, at, |label| STUDIO_URL.replace("{window}", label).replace("{tab}", tab))?;
    eprintln!("[browser] studio window none → {label} (tab {tab} torn off)");
    Ok(json!({ "window": label }))
}

pub fn open_chat_window(app: &AppHandle<Wry>, chat: &str, at: Option<(f64, f64)>) -> Result<Value, String> {
    policy::label_of(chat)?;
    let label = open_window_with(app, at, |label| CHAT_WINDOW_URL.replace("{window}", label).replace("{chat}", chat))?;
    eprintln!("[browser] studio window none → {label} (chat {chat} torn off)");
    Ok(json!({ "window": label }))
}

fn open_window_with(app: &AppHandle<Wry>, at: Option<(f64, f64)>, url_of: impl Fn(&str) -> String) -> Result<String, String> {
    let origin = studio_window_origin(app, at)?;
    let _opening = OPENING_STUDIO_WINDOW.lock().map_err(|failure| failure.to_string())?;
    let windows = app.windows();
    let taken: Vec<&str> = windows.keys().map(String::as_str).collect();
    let label = policy::next_studio_window_label(&taken);
    let url = url_of(&label);
    let window = WebviewWindowBuilder::new(app, &label, WebviewUrl::App(url.into()))
        .title(STUDIO_TITLE)
        .inner_size(STUDIO_WINDOW.width, STUDIO_WINDOW.height)
        .min_inner_size(STUDIO_MIN_WIDTH, STUDIO_MIN_HEIGHT)
        .position(origin.x, origin.y)
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true)
        .traffic_light_position(TRAFFIC_LIGHTS_AT)
        .accept_first_mouse(true)
        .disable_drag_drop_handler()
        .build()
        .map_err(|failure| failure.to_string())?;
    super::window_buttons::keep_window_buttons_at(&window, TRAFFIC_LIGHTS_AT);
    Ok(label)
}

pub fn focus_window(app: &AppHandle<Wry>, window_label: &str) -> Result<Value, String> {
    let unknown = || NO_STUDIO_WINDOW.replace("{window}", window_label);

    if !is_studio_label(window_label) {
        return Err(unknown());
    }

    let window = app.get_window(window_label).ok_or_else(unknown)?;
    window.unminimize().map_err(|failure| failure.to_string())?;
    window.set_focus().map(|_| Value::Null).map_err(|failure| failure.to_string())
}
