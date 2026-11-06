use super::page_press::{is_page_at, is_page_view};
use objc2::runtime::{AnyClass, Imp, Sel};
use objc2::{ffi, sel, ClassType};
use objc2_app_kit::NSView;
use objc2_core_foundation::CGPoint;
use objc2_web_kit::WKWebView;
use std::sync::OnceLock;

type HitTest = unsafe extern "C-unwind" fn(&NSView, Sel, CGPoint) -> *mut NSView;

struct WebViewHitTest(HitTest);

unsafe impl Send for WebViewHitTest {}
unsafe impl Sync for WebViewHitTest {}

static WEB_VIEW_HIT_TEST: OnceLock<WebViewHitTest> = OnceLock::new();

unsafe extern "C-unwind" fn hit_test(this: &NSView, cmd: Sel, point: CGPoint) -> *mut NSView {
    let Some(WebViewHitTest(web_view_hit_test)) = WEB_VIEW_HIT_TEST.get() else { return std::ptr::null_mut() };
    let found = unsafe { web_view_hit_test(this, cmd, point) };

    if found.is_null() || is_page_view(this) {
        return found;
    }

    let Some(superview) = (unsafe { this.superview() }) else { return found };

    if is_page_at(&superview, point) {
        return std::ptr::null_mut();
    }

    found
}

pub fn let_pages_take_their_pointer(view: &WKWebView) {
    let class: &AnyClass = view.class();

    if WEB_VIEW_HIT_TEST.get().is_some() {
        return;
    }

    let selector = sel!(hitTest:);
    let Some(inherited) = WKWebView::class().instance_method(selector) else {
        eprintln!("[browser] studio hit test stays WebKit's (WKWebView answers no hitTest:)");
        return;
    };
    let web_view_hit_test: HitTest = unsafe { std::mem::transmute::<Imp, HitTest>(inherited.implementation()) };
    let _ = WEB_VIEW_HIT_TEST.set(WebViewHitTest(web_view_hit_test));
    let ours: Imp = unsafe { std::mem::transmute::<HitTest, Imp>(hit_test) };
    let types = c"@@:{CGPoint=dd}";
    let added = unsafe { ffi::class_addMethod(class as *const AnyClass as *mut AnyClass, selector, ours, types.as_ptr()) };
    let said = if added.as_bool() { "its own hitTest" } else { "a hitTest already, left alone" };
    eprintln!("[browser] studio hit test on {} → {said} (pages under the studio take their own pointer)", class.name().to_string_lossy());
}
