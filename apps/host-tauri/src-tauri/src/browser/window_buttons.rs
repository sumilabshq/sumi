use objc2_app_kit::{NSView, NSWindow, NSWindowButton};
use tauri::{LogicalPosition, WebviewWindow, WindowEvent, Wry};

const BUTTONS: [NSWindowButton; 3] = [NSWindowButton::CloseButton, NSWindowButton::MiniaturizeButton, NSWindowButton::ZoomButton];

pub fn keep_window_buttons_at(window: &WebviewWindow<Wry>, at: LogicalPosition<f64>) {
    place_buttons_soon(window, at);
    let placed = window.clone();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Resized(_) | WindowEvent::Focused(_) | WindowEvent::ThemeChanged(_)) {
            place_buttons_soon(&placed, at);
        }
    });
}

fn place_buttons_soon(window: &WebviewWindow<Wry>, at: LogicalPosition<f64>) {
    let Ok(pointer) = window.ns_window() else { return };
    let address = pointer as usize;
    let placed = window.run_on_main_thread(move || {
        if let Some(ns_window) = unsafe { (address as *const NSWindow).as_ref() } {
            place_buttons(ns_window, at);
        }
    });

    if let Err(failure) = placed {
        eprintln!("[browser] window buttons default → default (the move could not reach the main thread: {failure})");
    }
}

fn place_buttons(window: &NSWindow, at: LogicalPosition<f64>) {
    let buttons: Vec<_> = BUTTONS.iter().filter_map(|kind| window.standardWindowButton(*kind)).collect();
    let [close, miniaturize, _] = buttons.as_slice() else { return };
    let Some(title_bar) = (unsafe { close.superview().and_then(|holder| holder.superview()) }) else { return };
    let close_frame = NSView::frame(close);
    let spacing = NSView::frame(miniaturize).origin.x - close_frame.origin.x;
    let mut title_bar_frame = NSView::frame(&title_bar);
    title_bar_frame.size.height = close_frame.size.height + at.y;
    title_bar_frame.origin.y = window.frame().size.height - title_bar_frame.size.height;
    title_bar.setFrame(title_bar_frame);

    for (index, button) in buttons.iter().enumerate() {
        let mut origin = NSView::frame(button).origin;
        origin.x = at.x + index as f64 * spacing;
        button.setFrameOrigin(origin);
    }
}
