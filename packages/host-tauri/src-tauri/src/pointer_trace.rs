use block2::RcBlock;
use objc2::MainThreadMarker;
use objc2_app_kit::{NSEvent, NSEventMask, NSEventType};
use std::ptr::NonNull;
use tauri::plugin::{Builder, TauriPlugin};
use tauri::Wry;

fn traced_mask() -> NSEventMask {
    NSEventMask::LeftMouseDown
        | NSEventMask::LeftMouseUp
        | NSEventMask::LeftMouseDragged
        | NSEventMask::MouseMoved
        | NSEventMask::MouseEntered
        | NSEventMask::MouseExited
}

fn type_name_of(kind: NSEventType) -> &'static str {
    match kind {
        NSEventType::LeftMouseDown => "down",
        NSEventType::LeftMouseUp => "up",
        NSEventType::LeftMouseDragged => "dragged",
        NSEventType::MouseMoved => "moved",
        NSEventType::MouseEntered => "entered",
        NSEventType::MouseExited => "exited",
        _ => "other",
    }
}

fn trace(event: &NSEvent) {
    let Some(mtm) = MainThreadMarker::new() else {
        return;
    };

    let is_key = event.window(mtm).is_some_and(|window| window.isKeyWindow());
    let at = event.locationInWindow();
    eprintln!(
        "[pointer] {:.3} {} key {is_key} at {:.0},{:.0}",
        event.timestamp(),
        type_name_of(event.r#type()),
        at.x,
        at.y
    );
}

fn start_tracing() {
    let handler = RcBlock::new(|event: NonNull<NSEvent>| {
        trace(unsafe { event.as_ref() });
        event.as_ptr()
    });
    let monitor = unsafe { NSEvent::addLocalMonitorForEventsMatchingMask_handler(traced_mask(), &handler) };
    std::mem::forget(monitor);
}

pub fn init() -> TauriPlugin<Wry> {
    Builder::new("pointer-trace")
        .setup(|_app, _api| {
            if cfg!(debug_assertions) {
                start_tracing();
            }

            Ok(())
        })
        .build()
}
