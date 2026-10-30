use super::page_holes::{is_in_hole, Rect};
use objc2::rc::Retained;
use objc2::runtime::Bool;
use objc2::{class, msg_send, MainThreadMarker};
use objc2_app_kit::{NSEvent, NSView};
use objc2_core_foundation::CGPoint;
use objc2_web_kit::WKWebView;
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

thread_local! {
    static PAGE_VIEWS: RefCell<HashMap<usize, String>> = RefCell::new(HashMap::new());
    static HOLES: RefCell<HashMap<usize, Vec<Rect>>> = RefCell::new(HashMap::new());
    static ON_PRESSED: RefCell<Option<Rc<dyn Fn(&str)>>> = const { RefCell::new(None) };
    static ON_HOVERED: RefCell<Option<Rc<dyn Fn(&str, f64, f64)>>> = const { RefCell::new(None) };
}

const ORDERED_BELOW: isize = -1;

pub struct PageHit {
    pub view: Retained<NSView>,
    pub page_id: String,
    pub is_in_hole: bool,
}

pub struct PageTold {
    pub pressed: Rc<dyn Fn(&str)>,
    pub hovered: Rc<dyn Fn(&str, f64, f64)>,
}

pub fn watch(view: &WKWebView, page_id: &str, told: PageTold) {
    PAGE_VIEWS.with(|views| views.borrow_mut().insert(key_of(view), page_id.to_string()));
    ON_PRESSED.with(|held| held.replace(Some(told.pressed)));
    ON_HOVERED.with(|held| held.replace(Some(told.hovered)));
}

pub fn forget(view: &WKWebView) {
    PAGE_VIEWS.with(|views| views.borrow_mut().remove(&key_of(view)));
    HOLES.with(|holes| holes.borrow_mut().remove(&key_of(view)));
}

pub fn cut_holes(view: &WKWebView, holes: Vec<Rect>) {
    HOLES.with(|held| held.borrow_mut().insert(key_of(view), holes));
}

pub fn tell_hovered(page_id: &str, x: f64, y: f64) {
    if let Some(on_hovered) = ON_HOVERED.with(|held| held.borrow().clone()) {
        on_hovered(page_id, x, y);
    }
}

pub fn tell_pressed(page_id: &str) {
    if let Some(on_pressed) = ON_PRESSED.with(|held| held.borrow().clone()) {
        on_pressed(page_id);
    }
}

pub fn is_page_view(view: &NSView) -> bool {
    PAGE_VIEWS.with(|views| views.borrow().contains_key(&key_of(view)))
}

fn key_of<T>(view: &T) -> usize {
    view as *const T as usize
}

fn is_web_view(view: &NSView) -> bool {
    let answer: Bool = unsafe { msg_send![view, isKindOfClass: class!(WKWebView)] };
    answer.as_bool()
}

pub fn keep_under_studio(view: &WKWebView) {
    let Some(superview) = (unsafe { view.superview() }) else {
        eprintln!("[browser] STACKPROBE page view has no superview");
        return;
    };
    let stacked: Vec<Retained<NSView>> = superview.subviews().iter().collect();
    let page_at = stacked.iter().position(|held| key_of(&**held) == key_of(view));
    let studio_at = stacked.iter().position(|held| is_web_view(held) && !is_page_view(held));
    let kinds: Vec<String> = stacked
        .iter()
        .map(|held| {
            let frame = held.frame();
            let kind = if is_page_view(held) { "page" } else if is_web_view(held) { "web" } else { "view" };
            format!("{kind}{}@{:.0},{:.0} {:.0}x{:.0}", if held.isHidden() { "(hidden)" } else { "" }, frame.origin.x, frame.origin.y, frame.size.width, frame.size.height)
        })
        .collect();
    let opaque: bool = unsafe { msg_send![&*superview, isOpaque] };
    eprintln!("[browser] STACKPROBE page at {page_at:?}, studio at {studio_at:?}, superview opaque {opaque}: {}", kinds.join(" | "));
    let (Some(page_at), Some(studio_at)) = (page_at, studio_at) else {
        eprintln!("[browser] page view stays where it is (page at {page_at:?}, studio at {studio_at:?} among {} views)", stacked.len());
        return;
    };

    if page_at < studio_at {
        return;
    }

    let _: () = unsafe { msg_send![&superview, addSubview: view, positioned: ORDERED_BELOW, relativeTo: &*stacked[studio_at]] };
    eprintln!("[browser] page view {page_at} → under the studio at {studio_at} (the studio draws over its pages)");
}

pub fn page_hit_of(event: &NSEvent) -> Option<PageHit> {
    let main_thread = MainThreadMarker::new()?;
    let content = event.window(main_thread)?.contentView()?;
    let point: CGPoint = content.convertPoint_fromView(event.locationInWindow(), None);
    let mut stacked: Vec<Retained<NSView>> = content.subviews().iter().filter(|held| is_page_view(held)).collect();
    stacked.reverse();
    let view = stacked.into_iter().find(|held| !held.isHidden() && is_inside(point, held))?;
    let page_id = PAGE_VIEWS.with(|views| views.borrow().get(&key_of(&*view)).cloned())?;
    let is_in_hole = is_point_in_hole(&view, event);
    Some(PageHit { view, page_id, is_in_hole })
}

pub fn is_page_at(content: &NSView, point: CGPoint) -> bool {
    content.subviews().iter().any(|held| {
        if !is_page_view(&held) || held.isHidden() || !is_inside(point, &held) {
            return false;
        }

        let inside = held.convertPoint_fromView(point, Some(content));
        let from_top = if held.isFlipped() { inside.y } else { held.bounds().size.height - inside.y };
        !HOLES.with(|holes| holes.borrow().get(&key_of(&*held)).is_some_and(|cut| is_in_hole(cut, inside.x, from_top)))
    })
}

pub fn dump_views(content: &NSView) {
    let lines: Vec<String> = content
        .subviews()
        .iter()
        .map(|held| {
            let frame = held.frame();
            let kind = if is_page_view(&held) { "page" } else if is_web_view(&held) { "studio" } else { "view" };
            format!("{kind}{}@{:.0},{:.0} {:.0}x{:.0}", if held.isHidden() { "(hidden)" } else { "" }, frame.origin.x, frame.origin.y, frame.size.width, frame.size.height)
        })
        .collect();
    eprintln!("[browser] VIEWDUMP {}", lines.join(" | "));
}

fn is_inside(point: CGPoint, view: &NSView) -> bool {
    let frame = view.frame();
    point.x >= frame.origin.x
        && point.x < frame.origin.x + frame.size.width
        && point.y >= frame.origin.y
        && point.y < frame.origin.y + frame.size.height
}

fn is_point_in_hole(view: &NSView, event: &NSEvent) -> bool {
    let point = view.convertPoint_fromView(event.locationInWindow(), None);
    let from_top = if view.isFlipped() { point.y } else { view.bounds().size.height - point.y };
    HOLES.with(|holes| holes.borrow().get(&key_of(view)).is_some_and(|cut| is_in_hole(cut, point.x, from_top)))
}
