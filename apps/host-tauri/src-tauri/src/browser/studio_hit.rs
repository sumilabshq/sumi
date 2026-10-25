use super::page_press::is_page_at;
use objc2::runtime::{AnyClass, AnyObject, ClassBuilder, Sel};
use objc2::{ffi, msg_send, sel};
use objc2_app_kit::NSView;
use objc2_core_foundation::CGPoint;
use objc2_web_kit::WKWebView;
use std::sync::OnceLock;

const CLASS_NAME: &std::ffi::CStr = c"WidgetariumStudioWebView";

struct StudioClass {
    own: &'static AnyClass,
    base: &'static AnyClass,
}

unsafe impl Send for StudioClass {}
unsafe impl Sync for StudioClass {}

static STUDIO_CLASS: OnceLock<StudioClass> = OnceLock::new();

unsafe extern "C-unwind" fn hit_test(this: &NSView, _cmd: Sel, point: CGPoint) -> *mut NSView {
    let Some(class) = STUDIO_CLASS.get() else { return std::ptr::null_mut() };
    let found: *mut NSView = unsafe { msg_send![super(this, class.base), hitTest: point] };

    if found.is_null() {
        return found;
    }

    let Some(superview) = (unsafe { this.superview() }) else { return found };

    if is_page_at(&superview, point) {
        return std::ptr::null_mut();
    }

    found
}

fn studio_class(base: &'static AnyClass) -> &'static StudioClass {
    STUDIO_CLASS.get_or_init(|| {
        let mut builder = ClassBuilder::new(CLASS_NAME, base).expect("the studio web view class is registered once");
        unsafe {
            builder.add_method(sel!(hitTest:), hit_test as unsafe extern "C-unwind" fn(_, _, _) -> _);
        }
        StudioClass { own: builder.register(), base }
    })
}

pub fn let_pages_take_their_pointer(view: &WKWebView) {
    let current = view.class();

    if current.name() == CLASS_NAME {
        return;
    }

    let class = studio_class(current);

    if !std::ptr::eq(class.base, current) {
        eprintln!("[browser] studio view class {} → kept (the studio class was made over {})", current.name().to_string_lossy(), class.base.name().to_string_lossy());
        return;
    }

    unsafe { ffi::object_setClass(view as *const WKWebView as *mut AnyObject, class.own) };
    eprintln!("[browser] studio view class {} → {} (pages under it take their own pointer)", current.name().to_string_lossy(), CLASS_NAME.to_string_lossy());
}
