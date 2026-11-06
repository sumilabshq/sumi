use super::page_press::{is_page_view, page_id_of_view, studio_view_beside, tell_keyed};
use block2::RcBlock;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::MainThreadMarker;
use objc2_app_kit::{NSEvent, NSEventMask, NSEventModifierFlags, NSResponder, NSView, NSWindow};
use std::cell::RefCell;
use std::ptr::NonNull;

// TRADE-OFF: copies DOOR_LETTERS of menu-key-labels.ts; the monitor decides before the studio can answer
const MENU_KEYS: [(u16, &str); 4] = [(40, "k"), (45, "n"), (34, "i"), (37, "l")];

thread_local! {
    static MONITOR: RefCell<Option<Retained<AnyObject>>> = const { RefCell::new(None) };
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
        if hand_menu_key_to_studio(unsafe { event.as_ref() }) {
            return std::ptr::null_mut();
        }

        event.as_ptr()
    });
    let monitor = unsafe { NSEvent::addLocalMonitorForEventsMatchingMask_handler(NSEventMask::KeyDown, &heard) };

    if monitor.is_none() {
        eprintln!("[browser] page key monitor → none (AppKit refused it; menu keys pressed in a page stay in the page)");
    }

    monitor
}

fn hand_menu_key_to_studio(event: &NSEvent) -> bool {
    let Some(letter) = menu_letter_of(event) else { return false };
    let Some(main_thread) = MainThreadMarker::new() else { return false };
    let Some(window) = event.window(main_thread) else { return false };
    let Some(page_view) = focused_page_view(&window) else { return false };
    let Some(page_id) = page_id_of_view(&page_view) else { return false };
    let Some(studio) = studio_view_beside(&page_view) else {
        eprintln!("[browser] key ⌘{} page {page_id} → page (no studio view beside it)", letter.to_uppercase());
        return false;
    };

    let responder: &NSResponder = &studio;
    window.makeFirstResponder(Some(responder));
    eprintln!("[browser] key ⌘{} page {page_id} → studio (keyboard focus moved off the page)", letter.to_uppercase());
    tell_keyed(&page_id, letter);
    true
}

fn menu_letter_of(event: &NSEvent) -> Option<&'static str> {
    let held = event.modifierFlags();
    let others = NSEventModifierFlags::Shift | NSEventModifierFlags::Option | NSEventModifierFlags::Control;

    if !held.contains(NSEventModifierFlags::Command) || held.intersects(others) {
        return None;
    }

    let code = event.keyCode();
    MENU_KEYS.iter().find(|(key, _)| *key == code).map(|(_, letter)| *letter)
}

fn focused_page_view(window: &NSWindow) -> Option<Retained<NSView>> {
    let mut view = window.firstResponder()?.downcast::<NSView>().ok()?;

    loop {
        if is_page_view(&view) {
            return Some(view);
        }

        view = unsafe { view.superview() }?;
    }
}
