use super::navigation_proxy::{self, FailedLoad, NavigationHooks, SubFrame};
use super::policy::{self, PAGE_LABEL_PREFIX};
use super::webkit::{self, view_of, Answer, ShotFormat, ShotRegion};
use objc2_web_kit::WKWebView;
use serde_json::{json, Value};
use std::rc::Rc;
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;
use tauri::webview::{DownloadEvent, NewWindowResponse, PageLoadEvent, PermissionResponse};
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Webview, WebviewBuilder, WebviewUrl, Wry};

pub const NO_WINDOW: &str = "The studio window is not open, so the browser has nowhere to draw a page.";
pub const NO_PAGE: &str = "The browser holds no page \"{id}\".";
pub const REFUSED_ADDRESS: &str = "The browser opens only web pages, and \"{address}\" is not one.";
pub const NO_ANSWER: &str = "The page did not answer.";

const MAIN_WINDOW: &str = "main";
const BLANK: &str = "about:blank";
const SMALLEST_SIDE: f64 = 1.0;

pub struct Placement {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub corner: f64,
}

impl Clone for Placement {
    fn clone(&self) -> Self {
        Placement { ..*self }
    }
}

impl Copy for Placement {}

const UNPLACED: Placement = Placement { x: 0.0, y: 0.0, width: SMALLEST_SIDE, height: SMALLEST_SIDE, corner: 0.0 };

impl Placement {
    fn position(&self) -> LogicalPosition<f64> {
        LogicalPosition::new(self.x, self.y)
    }

    fn size(&self) -> LogicalSize<f64> {
        LogicalSize::new(self.width.max(SMALLEST_SIDE), self.height.max(SMALLEST_SIDE))
    }
}

struct Shown {
    page: Option<String>,
    is_covered: bool,
}

pub struct Pages {
    sink: Mutex<Option<Channel<Value>>>,
    placement: Mutex<Placement>,
    shown: Mutex<Shown>,
}

fn page_id_of(label: &str) -> &str {
    label.strip_prefix(PAGE_LABEL_PREFIX).unwrap_or(label)
}

fn failure_text(failure: tauri::Error) -> String {
    failure.to_string()
}

fn on_main_thread<T: Send + 'static>(
    webview: &Webview<Wry>,
    work: impl FnOnce(&WKWebView, mpsc::Sender<Answer<T>>) + Send + 'static,
) -> Answer<T> {
    let (sender, receiver) = mpsc::channel();
    webview.with_webview(move |platform| work(view_of(&platform), sender)).map_err(failure_text)?;
    receiver.recv().map_err(|_| NO_ANSWER.to_string())?
}

fn answer_once<T: Send + 'static>(answer: mpsc::Sender<Answer<T>>) -> (impl Fn(Answer<T>) + 'static, mpsc::Sender<Answer<T>>) {
    let failure_answer = answer.clone();
    let answered = move |held: Answer<T>| {
        let _ = answer.send(held);
    };
    (answered, failure_answer)
}

fn browser_webviews(app: &AppHandle<Wry>) -> Vec<Webview<Wry>> {
    let all = app.webviews().into_iter();
    all.filter(|(label, _)| label.starts_with(PAGE_LABEL_PREFIX)).map(|(_, webview)| webview).collect()
}

fn opened_in_place(app: &AppHandle<Wry>, label: &str, url: &tauri::Url) -> NewWindowResponse<Wry> {
    if !policy::is_page_address(url.as_str()) {
        return NewWindowResponse::Deny;
    }

    if let Some(webview) = app.get_webview(label) {
        let _ = webview.navigate(url.clone());
    }

    NewWindowResponse::Deny
}

impl Pages {
    pub fn new() -> Self {
        Pages {
            sink: Mutex::new(None),
            placement: Mutex::new(UNPLACED),
            shown: Mutex::new(Shown { page: None, is_covered: false }),
        }
    }

    pub fn open(&self, sink: Channel<Value>) {
        self.sink.lock().expect("the browser's event sink").replace(sink);
    }

    fn told(&self, page_id: &str, kind: &str, facts: Value, failure: Value) {
        let event = json!({ "page": page_id, "kind": kind, "facts": facts, "failure": failure });

        if let Some(sink) = self.sink.lock().expect("the browser's event sink").as_ref() {
            let _ = sink.send(event);
        }
    }

    fn webview(&self, app: &AppHandle<Wry>, page_id: &str) -> Answer<Webview<Wry>> {
        let label = policy::label_of(page_id)?;
        app.get_webview(&label).ok_or_else(|| NO_PAGE.replace("{id}", page_id))
    }

    fn placement(&self) -> Placement {
        let held = self.placement.lock().expect("the page placement");
        Placement { ..*held }
    }

    pub fn create(self: &Arc<Self>, app: &AppHandle<Wry>, page_id: &str, profile_id: &str) -> Answer<Value> {
        let label = policy::label_of(page_id)?;

        if app.get_webview(&label).is_some() {
            return Ok(Value::Null);
        }

        let window = app.get_window(MAIN_WINDOW).ok_or(NO_WINDOW)?;
        let builder = self.builder(app, &label, profile_id)?;
        let placement = self.placement();
        let webview = window.add_child(builder, placement.position(), placement.size()).map_err(failure_text)?;
        webview.hide().map_err(failure_text)?;
        self.watch_navigation(&webview, page_id, placement.corner)?;
        Ok(Value::Null)
    }

    fn builder(self: &Arc<Self>, app: &AppHandle<Wry>, label: &str, profile_id: &str) -> Answer<WebviewBuilder<Wry>> {
        let blank = BLANK.parse().map_err(|_| NO_ANSWER)?;
        let loaded = self.clone();
        let titled = self.clone();
        let opener = app.clone();
        let opened_label = label.to_string();
        Ok(WebviewBuilder::new(label, WebviewUrl::External(blank))
            .data_store_identifier(policy::data_store_of(profile_id)?)
            .accept_first_mouse(true)
            .on_navigation(|url| policy::may_navigate(url.as_str()))
            .on_page_load(move |webview, payload| loaded.tell_load(&webview, payload.event()))
            .on_document_title_changed(move |webview, _title| titled.tell_facts(&webview, "title"))
            .on_new_window(move |url, _features| opened_in_place(&opener, &opened_label, &url))
            .on_download(|_webview, event| !matches!(event, DownloadEvent::Requested { .. }))
            .on_permission_request(|_webview, _kind| PermissionResponse::Deny))
    }

    fn watch_navigation(self: &Arc<Self>, webview: &Webview<Wry>, page_id: &str, corner: f64) -> Answer<()> {
        let started = self.clone();
        let failed = self.clone();
        let started_page = page_id.to_string();
        let failed_page = page_id.to_string();
        on_main_thread(webview, move |view, answer| {
            webkit::round_bottom_corners(view, corner);
            let hooks = NavigationHooks {
                started: Rc::new(move |view| started.told(&started_page, "started", webkit::facts_of(view), Value::Null)),
                failed: Rc::new(move |view, load| failed.tell_failure(&failed_page, view, load)),
            };
            let _ = answer.send(navigation_proxy::install(view, hooks));
        })
    }

    fn tell_failure(&self, page_id: &str, view: &WKWebView, load: FailedLoad) {
        let Some(kind) = policy::failure_kind(&load.domain, load.code) else {
            self.tell_stop(page_id, view, &load);
            return;
        };
        let failure = json!({ "kind": kind, "address": load.address, "code": load.description });
        self.told(page_id, "failed", webkit::facts_of(view), failure);
    }

    fn tell_stop(&self, page_id: &str, view: &WKWebView, load: &FailedLoad) {
        if policy::is_superseded(&load.domain, load.code) {
            return;
        }

        self.told(page_id, "stopped", webkit::facts_of(view), Value::Null);
    }

    fn tell_load(self: &Arc<Self>, webview: &Webview<Wry>, event: PageLoadEvent) {
        let kind = match event {
            PageLoadEvent::Started => "committed",
            PageLoadEvent::Finished => "finished",
        };
        self.tell_facts(webview, kind);
    }

    fn tell_facts(self: &Arc<Self>, webview: &Webview<Wry>, kind: &'static str) {
        let pages = self.clone();
        let page_id = page_id_of(webview.label()).to_string();
        let _ = webview.with_webview(move |platform| pages.told(&page_id, kind, webkit::facts_of(view_of(&platform)), Value::Null));
    }

    pub fn close(&self, app: &AppHandle<Wry>, page_id: &str) -> Answer<Value> {
        let Ok(webview) = self.webview(app, page_id) else { return Ok(Value::Null) };
        let _ = on_main_thread(&webview, |view, answer| {
            navigation_proxy::forget(view);
            let _ = answer.send(Ok(()));
        });
        webview.close().map(|_| Value::Null).map_err(failure_text)
    }

    pub fn navigate(&self, app: &AppHandle<Wry>, page_id: &str, address: &str) -> Answer<Value> {
        let refused = || REFUSED_ADDRESS.replace("{address}", address);

        if !policy::is_page_address(address) {
            return Err(refused());
        }

        let url = address.parse().map_err(|_| refused())?;
        self.webview(app, page_id)?.navigate(url).map(|_| Value::Null).map_err(failure_text)
    }

    pub fn step(&self, app: &AppHandle<Wry>, page_id: &str, move_by: fn(&WKWebView)) -> Answer<Value> {
        on_main_thread(&self.webview(app, page_id)?, move |view, answer| {
            move_by(view);
            let _ = answer.send(Ok(Value::Null));
        })
    }

    pub fn facts(&self, app: &AppHandle<Wry>, page_id: &str) -> Answer<Value> {
        on_main_thread(&self.webview(app, page_id)?, |view, answer| {
            let _ = answer.send(Ok(webkit::facts_of(view)));
        })
    }

    pub fn place(&self, app: &AppHandle<Wry>, placement: Placement) -> Answer<Value> {
        let mut held = self.placement.lock().expect("the page placement");
        let _ = std::mem::replace(&mut *held, placement);

        for webview in browser_webviews(app) {
            webview.set_position(placement.position()).map_err(failure_text)?;
            webview.set_size(placement.size()).map_err(failure_text)?;
            let _ = webview.with_webview(move |platform| webkit::round_bottom_corners(view_of(&platform), placement.corner));
        }

        Ok(Value::Null)
    }

    pub fn show(&self, app: &AppHandle<Wry>, page_id: Option<String>) -> Answer<Value> {
        let mut shown = self.shown.lock().expect("the shown page");
        shown.page = page_id;
        apply_shown(app, &shown)
    }

    pub fn cover(&self, app: &AppHandle<Wry>, is_covered: bool) -> Answer<Value> {
        let mut shown = self.shown.lock().expect("the shown page");
        shown.is_covered = is_covered;
        apply_shown(app, &shown)
    }

    pub fn snapshot(&self, app: &AppHandle<Wry>, page_id: &str, region: Option<ShotRegion>, format: ShotFormat) -> Answer<Vec<u8>> {
        on_main_thread(&self.webview(app, page_id)?, move |view, answer| {
            let (answered, failure_answer) = answer_once(answer);

            if let Err(failure) = webkit::snapshot(view, region, format, answered) {
                let _ = failure_answer.send(Err(failure));
            }
        })
    }

    pub fn evaluate(&self, app: &AppHandle<Wry>, page_id: &str, script: String) -> Answer<Value> {
        let text: String = on_main_thread(&self.webview(app, page_id)?, move |view, answer| {
            let (answered, failure_answer) = answer_once(answer);

            if let Err(failure) = webkit::evaluate_isolated(view, &script, None, answered) {
                let _ = failure_answer.send(Err(failure));
            }
        })?;
        Ok(Value::String(text))
    }

    pub fn evaluate_in_frames(&self, app: &AppHandle<Wry>, page_id: &str, script: String) -> Answer<Value> {
        let frames: Vec<(String, mpsc::Receiver<Answer<String>>)> = on_main_thread(&self.webview(app, page_id)?, move |view, answer| {
            let started = navigation_proxy::sub_frames(view).into_iter().map(|sub_frame| evaluated_in(view, &script, sub_frame));
            let _ = answer.send(Ok(started.collect()));
        })?;
        let answers = frames.into_iter().map(|(url, receiver)| {
            let answer = receiver.recv().unwrap_or_else(|_| Err(NO_ANSWER.into()));
            json!({ "url": url, "answer": answer.ok() })
        });
        Ok(Value::Array(answers.collect()))
    }
}

fn visible_label(shown: &Shown) -> Answer<Option<String>> {
    if shown.is_covered {
        return Ok(None);
    }

    shown.page.as_deref().map(policy::label_of).transpose()
}

fn apply_shown(app: &AppHandle<Wry>, shown: &Shown) -> Answer<Value> {
    let visible_label = visible_label(shown)?;

    for webview in browser_webviews(app) {
        let is_visible = visible_label.as_deref() == Some(webview.label());
        let result = if is_visible { webview.show() } else { webview.hide() };
        result.map_err(failure_text)?;
    }

    Ok(Value::Null)
}

fn evaluated_in(view: &WKWebView, script: &str, sub_frame: SubFrame) -> (String, mpsc::Receiver<Answer<String>>) {
    let (sender, receiver) = mpsc::channel();
    let (answered, failure_answer) = answer_once(sender);

    if let Err(failure) = webkit::evaluate_isolated(view, script, Some(&sub_frame.frame), answered) {
        let _ = failure_answer.send(Err(failure));
    }

    (sub_frame.url, receiver)
}
