use block2::Block;
use objc2::rc::Retained;
use objc2::runtime::{AnyClass, AnyObject, Bool, ClassBuilder, NSObject, Sel};
use objc2::{msg_send, sel, ClassType};
use objc2_foundation::{NSError, NSURL, NSURLErrorFailingURLErrorKey};
use objc2_web_kit::{WKFrameInfo, WKNavigationAction, WKNavigationActionPolicy, WKWebView};
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::OnceLock;

const CLASS_NAME: &std::ffi::CStr = c"WidgetariumBrowserNavigationProxy";
const FRAMES_KEPT: usize = 64;

pub struct FailedLoad {
    pub domain: String,
    pub code: i64,
    pub address: String,
    pub description: String,
}

pub struct NavigationHooks {
    pub started: Rc<dyn Fn(&WKWebView)>,
    pub failed: Rc<dyn Fn(&WKWebView, FailedLoad)>,
}

pub struct SubFrame {
    pub frame: Retained<WKFrameInfo>,
    pub url: String,
}

struct Proxy {
    view: usize,
    inner: Retained<AnyObject>,
    hooks: NavigationHooks,
    frames: Vec<SubFrame>,
    held: Retained<AnyObject>,
}

thread_local! {
    static PROXIES: RefCell<HashMap<usize, Proxy>> = RefCell::new(HashMap::new());
}

struct ProxyClass(&'static AnyClass);

unsafe impl Send for ProxyClass {}
unsafe impl Sync for ProxyClass {}

static PROXY_CLASS: OnceLock<ProxyClass> = OnceLock::new();

fn key_of(this: &AnyObject) -> usize {
    this as *const AnyObject as usize
}

fn inner_of(this: &AnyObject) -> Option<Retained<AnyObject>> {
    PROXIES.with(|proxies| proxies.borrow().get(&key_of(this)).map(|proxy| proxy.inner.clone()))
}

fn is_own(sel: Sel) -> bool {
    [
        sel!(webView:decidePolicyForNavigationAction:decisionHandler:),
        sel!(webView:didStartProvisionalNavigation:),
        sel!(webView:didFailProvisionalNavigation:withError:),
        sel!(webView:didFailNavigation:withError:),
    ]
    .contains(&sel)
}

unsafe extern "C-unwind" fn responds_to_selector(this: &AnyObject, _cmd: Sel, asked: Sel) -> Bool {
    if is_own(asked) || this.class().responds_to(asked) {
        return Bool::YES;
    }

    let answer = inner_of(this).is_some_and(|inner| {
        let held: Bool = unsafe { msg_send![&*inner, respondsToSelector: asked] };
        held.as_bool()
    });
    Bool::new(answer)
}

unsafe extern "C-unwind" fn forwarding_target(this: &AnyObject, _cmd: Sel, _asked: Sel) -> *mut AnyObject {
    inner_of(this).map(|inner| Retained::as_ptr(&inner) as *mut AnyObject).unwrap_or(std::ptr::null_mut())
}

fn url_of_action(action: &WKNavigationAction) -> String {
    let request = unsafe { action.request() };
    request.URL().and_then(|url| url.absoluteString()).map(|text| text.to_string()).unwrap_or_default()
}

fn remember_frame(this: &AnyObject, action: &WKNavigationAction) {
    let Some(frame) = (unsafe { action.targetFrame() }) else { return };

    if unsafe { frame.isMainFrame() } {
        return;
    }

    let url = url_of_action(action);
    PROXIES.with(|proxies| {
        let mut proxies = proxies.borrow_mut();
        let Some(proxy) = proxies.get_mut(&key_of(this)) else { return };
        proxy.frames.retain(|kept| !std::ptr::eq(&*kept.frame, &*frame));
        proxy.frames.push(SubFrame { frame, url });

        if proxy.frames.len() > FRAMES_KEPT {
            proxy.frames.remove(0);
        }
    });
}

unsafe extern "C-unwind" fn decide_policy(
    this: &AnyObject,
    _cmd: Sel,
    view: &WKWebView,
    action: &WKNavigationAction,
    handler: &Block<dyn Fn(WKNavigationActionPolicy)>,
) {
    remember_frame(this, action);

    let Some(inner) = inner_of(this) else {
        handler.call((WKNavigationActionPolicy::Cancel,));
        return;
    };

    let _: () = unsafe { msg_send![&*inner, webView: view, decidePolicyForNavigationAction: action, decisionHandler: handler] };
}

fn with_hooks(this: &AnyObject, run: impl FnOnce(&NavigationHooks)) {
    let hooks = PROXIES.with(|proxies| {
        let proxies = proxies.borrow();
        let proxy = proxies.get(&key_of(this))?;
        Some(NavigationHooks { started: proxy.hooks.started.clone(), failed: proxy.hooks.failed.clone() })
    });

    if let Some(hooks) = hooks {
        run(&hooks);
    }
}

unsafe extern "C-unwind" fn did_start(this: &AnyObject, _cmd: Sel, view: &WKWebView, _navigation: *mut AnyObject) {
    PROXIES.with(|proxies| {
        if let Some(proxy) = proxies.borrow_mut().get_mut(&key_of(this)) {
            proxy.frames.clear();
        }
    });
    with_hooks(this, |hooks| (hooks.started)(view));
}

fn failed_load_of(error: &NSError) -> FailedLoad {
    let failing = error.userInfo().objectForKey(unsafe { NSURLErrorFailingURLErrorKey });
    let address = failing.and_then(|held| held.downcast_ref::<NSURL>().and_then(|url| url.absoluteString()).map(|text| text.to_string())).unwrap_or_default();
    FailedLoad {
        domain: error.domain().to_string(),
        code: error.code() as i64,
        address,
        description: error.localizedDescription().to_string(),
    }
}

unsafe extern "C-unwind" fn did_fail(
    this: &AnyObject,
    _cmd: Sel,
    view: &WKWebView,
    _navigation: *mut AnyObject,
    error: &NSError,
) {
    let failed = failed_load_of(error);
    with_hooks(this, move |hooks| (hooks.failed)(view, failed));
}

fn registered_class() -> &'static AnyClass {
    PROXY_CLASS
        .get_or_init(|| {
            let mut builder = ClassBuilder::new(CLASS_NAME, NSObject::class()).expect("the navigation proxy class is registered once");
            unsafe {
                builder.add_method(sel!(respondsToSelector:), responds_to_selector as unsafe extern "C-unwind" fn(_, _, _) -> _);
                builder.add_method(sel!(forwardingTargetForSelector:), forwarding_target as unsafe extern "C-unwind" fn(_, _, _) -> _);
                builder.add_method(
                    sel!(webView:decidePolicyForNavigationAction:decisionHandler:),
                    decide_policy as unsafe extern "C-unwind" fn(_, _, _, _, _),
                );
                builder.add_method(sel!(webView:didStartProvisionalNavigation:), did_start as unsafe extern "C-unwind" fn(_, _, _, _));
                builder.add_method(
                    sel!(webView:didFailProvisionalNavigation:withError:),
                    did_fail as unsafe extern "C-unwind" fn(_, _, _, _, _),
                );
                builder.add_method(sel!(webView:didFailNavigation:withError:), did_fail as unsafe extern "C-unwind" fn(_, _, _, _, _));
            }
            ProxyClass(builder.register())
        })
        .0
}

pub fn install(view: &WKWebView, hooks: NavigationHooks) -> Result<(), String> {
    let inner: Option<Retained<AnyObject>> = unsafe { msg_send![view, navigationDelegate] };
    let inner = inner.ok_or("The page has no navigation delegate to wrap.")?;
    let held: Retained<AnyObject> = unsafe { msg_send![registered_class(), new] };
    let view_key = view as *const WKWebView as usize;
    PROXIES.with(|proxies| {
        proxies.borrow_mut().insert(key_of(&held), Proxy { view: view_key, inner, hooks, frames: Vec::new(), held: held.clone() });
    });
    let _: () = unsafe { msg_send![view, setNavigationDelegate: &*held] };
    Ok(())
}

pub fn forget(view: &WKWebView) {
    let view_key = view as *const WKWebView as usize;
    PROXIES.with(|proxies| {
        let mut proxies = proxies.borrow_mut();
        let Some(proxy_key) = proxies.iter().find(|(_, proxy)| proxy.view == view_key).map(|(key, _)| *key) else { return };
        let Some(proxy) = proxies.remove(&proxy_key) else { return };
        let _: () = unsafe { msg_send![view, setNavigationDelegate: &*proxy.inner] };
        drop(proxy.held);
    });
}

pub fn sub_frames(view: &WKWebView) -> Vec<SubFrame> {
    let view_key = view as *const WKWebView as usize;
    PROXIES.with(|proxies| {
        let proxies = proxies.borrow();
        let Some(proxy) = proxies.values().find(|proxy| proxy.view == view_key) else { return Vec::new() };
        proxy.frames.iter().map(|kept| SubFrame { frame: kept.frame.clone(), url: kept.url.clone() }).collect()
    })
}
