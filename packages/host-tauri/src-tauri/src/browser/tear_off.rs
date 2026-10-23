use tauri::{AppHandle, LogicalPosition, Manager, Monitor, Window, Wry};

const MAIN_WINDOW: &str = "main";
const NO_STUDIO: &str = "The studio window is not open, so a dragged tab has no window to leave.";
const NO_SCREEN: &str = "No screen holds the cursor, so a torn-off window has nowhere to stand.";

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

    let OwnWindowAsk { screen, window, .. } = ask;
    let left = kept_between(x - window.width / 2.0, screen.left, screen.left + screen.width - window.width);
    let top = kept_between(y - window.grab_top, screen.top, screen.top + screen.height - window.height);
    Some((left, top))
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
