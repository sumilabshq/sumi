use crate::browser::webkit::view_of;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::AnyThread;
use objc2_app_kit::{NSTrackingArea, NSTrackingAreaOptions};
use objc2_core_foundation::CGRect;
use objc2_web_kit::WKWebView;
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{AppHandle, Manager, RunEvent, Webview, WindowEvent, Wry};

fn background_tracking_options() -> NSTrackingAreaOptions {
    NSTrackingAreaOptions::MouseMoved
        | NSTrackingAreaOptions::MouseEnteredAndExited
        | NSTrackingAreaOptions::ActiveAlways
        | NSTrackingAreaOptions::InVisibleRect
}

fn is_background_area(area: &NSTrackingArea) -> bool {
    area.options() == background_tracking_options()
}

fn tracks_moves_while_inactive(area: &NSTrackingArea) -> bool {
    area.options().contains(NSTrackingAreaOptions::ActiveAlways | NSTrackingAreaOptions::MouseMoved)
}

fn background_area_count(view: &WKWebView) -> usize {
    view.trackingAreas().iter().filter(|area| is_background_area(area)).count()
}

fn track_while_inactive(view: &WKWebView) {
    if view.trackingAreas().iter().any(|area| tracks_moves_while_inactive(&area)) {
        return;
    }

    let owner: &AnyObject = view.as_ref();
    let area: Retained<NSTrackingArea> = unsafe {
        NSTrackingArea::initWithRect_options_owner_userInfo(NSTrackingArea::alloc(), CGRect::ZERO, background_tracking_options(), Some(owner), None)
    };
    view.addTrackingArea(&area);
}

fn stop_tracking_while_inactive(view: &WKWebView) {
    let background_areas: Vec<Retained<NSTrackingArea>> = view.trackingAreas().iter().filter(|area| is_background_area(area)).collect();

    for area in background_areas {
        view.removeTrackingArea(&area);
    }
}

fn apply_focus(webview: &Webview<Wry>, focused: bool) {
    let label = webview.label().to_string();
    let applied = webview.with_webview(move |platform| {
        let view = view_of(&platform);
        let count_before = background_area_count(view);

        if focused {
            stop_tracking_while_inactive(view);
        } else {
            track_while_inactive(view);
        }

        eprintln!("[background-hover] {label} focused {focused}: background areas {count_before} → {}", background_area_count(view));
    });

    if let Err(failure) = applied {
        eprintln!("[background-hover] {} kept its tracking areas (focused → {focused}): {failure}", webview.label());
    }
}

fn apply_focus_to_window(app: &AppHandle<Wry>, label: &str, focused: bool) {
    let Some(window) = app.get_window(label) else {
        return;
    };

    for webview in window.webviews() {
        apply_focus(&webview, focused);
    }
}

pub fn init() -> TauriPlugin<Wry> {
    Builder::new("background-hover")
        .on_event(|app, event| {
            if let RunEvent::WindowEvent { label, event: WindowEvent::Focused(focused), .. } = event {
                apply_focus_to_window(app, label, *focused);
            }
        })
        .build()
}
