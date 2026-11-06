use super::page_press::{page_hit_of, tell_hovered, tell_pressed};
use block2::RcBlock;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::MainThreadMarker;
use objc2_app_kit::{NSEvent, NSEventMask, NSEventType};
use std::cell::RefCell;
use std::ptr::NonNull;
use std::time::{Duration, Instant};

const HOVER_TOLD_EVERY: Duration = Duration::from_millis(40);

thread_local! {
    static MONITOR: RefCell<Option<Retained<AnyObject>>> = const { RefCell::new(None) };
    static HOVER_TOLD_AT: RefCell<Option<Instant>> = const { RefCell::new(None) };
}

pub fn watch() {
    MONITOR.with(|monitor| {
        if monitor.borrow().is_none() {
            monitor.replace(installed_monitor());
        }
    });
}

fn installed_monitor() -> Option<Retained<AnyObject>> {
    let heard = RcBlock::new(move |event: NonNull<NSEvent>| -> *mut NSEvent {
        tell_studio_about(unsafe { event.as_ref() });
        event.as_ptr()
    });
    let watched = NSEventMask::MouseMoved | NSEventMask::LeftMouseDown;
    let monitor = unsafe { NSEvent::addLocalMonitorForEventsMatchingMask_handler(watched, &heard) };

    if monitor.is_none() {
        eprintln!("[browser] page pointer monitor → none (AppKit refused it; the studio never hears the pointer over a page)");
    }

    monitor
}

fn tell_studio_about(event: &NSEvent) {
    let Some(hit) = page_hit_of(event).filter(|hit| !hit.is_in_hole) else { return };

    if event.r#type() == NSEventType::LeftMouseDown {
        tell_pressed(&hit.page_id);
        return;
    }

    if !is_hover_due() {
        return;
    }

    let Some((x, y)) = studio_point_of(event) else { return };
    tell_hovered(&hit.page_id, x, y);
}

fn is_hover_due() -> bool {
    let now = Instant::now();
    HOVER_TOLD_AT.with(|told| {
        let is_due = told.borrow().is_none_or(|at| now.duration_since(at) >= HOVER_TOLD_EVERY);

        if is_due {
            told.replace(Some(now));
        }

        is_due
    })
}

fn studio_point_of(event: &NSEvent) -> Option<(f64, f64)> {
    let main_thread = MainThreadMarker::new()?;
    let content = event.window(main_thread)?.contentView()?;
    let point = content.convertPoint_fromView(event.locationInWindow(), None);
    let from_top = if content.isFlipped() { point.y } else { content.bounds().size.height - point.y };
    Some((point.x, from_top))
}
