use super::navigation_proxy::{self, FailedLoad, NavigationHooks, SubFrame};
use super::policy::{self, PAGE_LABEL_PREFIX};
use super::tear_off::{TearOff, TornPage};
use super::webkit::{self, view_of, Answer, ShotFormat, ShotRegion};
use objc2_web_kit::WKWebView;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::rc::Rc;
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;
use tauri::webview::{DownloadEvent, NewWindowResponse, PageLoadEvent, PermissionResponse};
use tauri::window::Window;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Webview, WebviewBuilder, WebviewUrl, WindowEvent, Wry};

pub const NO_WINDOW: &str = "The studio window is not open, so the browser has nowhere to draw a page.";
pub const NO_PAGE: &str = "The browser holds no page \"{id}\".";
pub const REFUSED_ADDRESS: &str = "The browser opens only web pages, and \"{address}\" is not one.";
pub const NO_ANSWER: &str = "The page did not answer.";

const MAIN_WINDOW: &str = "main";
const OWN_WINDOW_LABEL_PREFIX: &str = "own-window-";
const OWN_WINDOW_WIDTH: f64 = 960.0;
const OWN_WINDOW_HEIGHT: f64 = 720.0;
const OWN_WINDOW_FALLBACK_AT: f64 = 120.0;
const OWN_WINDOW_GRAB_TOP: f64 = 20.0;
const BLANK: &str = "about:blank";
pub const OWN_WINDOW_OPENED: &str = "own-window-opened";
pub const OWN_WINDOW_CLOSED: &str = "own-window-closed";
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

pub struct Frame {
    pub page: String,
    pub placement: Placement,
}

struct Shown {
    placed: HashMap<String, Placement>,
    pages: Vec<String>,
    covered: HashSet<String>,
    own_windows: HashMap<String, String>,
}

impl Shown {
    fn empty() -> Self {
        Shown { placed: HashMap::new(), pages: Vec::new(), covered: HashSet::new(), own_windows: HashMap::new() }
    }

    fn placement_of(&self, page_id: &str) -> Placement {
        self.placed.get(page_id).copied().unwrap_or(UNPLACED)
    }
}

pub fn uncovered_pages(shown: &[String], covered: &HashSet<String>) -> HashSet<String> {
    shown.iter().filter(|page| !covered.contains(*page)).cloned().collect()
}

pub struct Pages {
    sink: Mutex<Option<Channel<Value>>>,
    shown: Mutex<Shown>,
    tear_off: Arc<TearOff>,
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
            shown: Mutex::new(Shown::empty()),
            tear_off: Arc::new(TearOff::new()),
        }
    }

    pub fn watch_tear_off(self: &Arc<Self>, app: &AppHandle<Wry>, page_id: &str, title: &str) -> Answer<Value> {
        self.webview(app, page_id)?;
        self.tear_off.watch(self, app, TornPage { page_id: page_id.to_string(), title: title.to_string() });
        Ok(Value::Null)
    }

    pub fn stop_tear_off(&self) -> Answer<Value> {
        self.tear_off.stop();
        Ok(Value::Null)
    }

    pub fn own_window_label(&self, page_id: &str) -> Option<String> {
        self.shown.lock().expect("the shown pages").own_windows.get(page_id).cloned()
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

    fn placement_of(&self, page_id: &str) -> Placement {
        self.shown.lock().expect("the shown pages").placement_of(page_id)
    }

    pub fn create(self: &Arc<Self>, app: &AppHandle<Wry>, page_id: &str, profile_id: &str) -> Answer<Value> {
        let label = policy::label_of(page_id)?;

        if app.get_webview(&label).is_some() {
            return Ok(Value::Null);
        }

        let window = app.get_window(MAIN_WINDOW).ok_or(NO_WINDOW)?;
        let builder = self.builder(app, &label, profile_id)?;
        let placement = self.placement_of(page_id);
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
        let own_window = self.forget(page_id);
        let Ok(webview) = self.webview(app, page_id) else {
            self.close_own_window(app, page_id, own_window, blank_facts());
            return Ok(Value::Null);
        };
        let last_facts = on_main_thread(&webview, |view, answer| {
            navigation_proxy::forget(view);
            let _ = answer.send(Ok(webkit::facts_of(view)));
        });
        let closed = webview.close().map(|_| Value::Null).map_err(failure_text);
        self.close_own_window(app, page_id, own_window, last_facts.unwrap_or_else(|_| blank_facts()));
        closed
    }

    fn close_own_window(&self, app: &AppHandle<Wry>, page_id: &str, label: Option<String>, facts: Value) {
        let Some(label) = label else { return };

        if let Some(window) = app.get_window(&label) {
            if let Err(failure) = window.destroy() {
                eprintln!("[browser] page {page_id} own window {label} → left open (the page closed, the window did not: {failure})");
            }
        }

        self.told(page_id, OWN_WINDOW_CLOSED, facts, Value::Null);
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

    fn forget(&self, page_id: &str) -> Option<String> {
        let mut shown = self.shown.lock().expect("the shown pages");
        shown.placed.remove(page_id);
        shown.pages.retain(|page| page != page_id);
        shown.covered.remove(page_id);
        shown.own_windows.remove(page_id)
    }

    fn is_in_own_window(&self, page_id: &str) -> bool {
        self.shown.lock().expect("the shown pages").own_windows.contains_key(page_id)
    }

    pub fn place(&self, app: &AppHandle<Wry>, page_id: &str, placement: Placement) -> Answer<Value> {
        let mut shown = self.shown.lock().expect("the shown pages");
        shown.placed.insert(page_id.to_string(), placement);

        if shown.own_windows.contains_key(page_id) {
            return Ok(Value::Null);
        }

        drop(shown);
        let Ok(webview) = self.webview(app, page_id) else { return Ok(Value::Null) };
        place_webview(&webview, placement)
    }

    pub fn show(&self, app: &AppHandle<Wry>, frames: Vec<Frame>) -> Answer<Value> {
        let mut shown = self.shown.lock().expect("the shown pages");
        shown.pages = frames.iter().map(|frame| frame.page.clone()).collect();

        for frame in frames {
            let is_in_studio = !shown.own_windows.contains_key(&frame.page);

            if let (true, Ok(webview)) = (is_in_studio, self.webview(app, &frame.page)) {
                place_webview(&webview, frame.placement)?;
            }

            shown.placed.insert(frame.page, frame.placement);
        }

        apply_shown(app, &shown)
    }

    pub fn cover(&self, app: &AppHandle<Wry>, page_id: &str, is_covered: bool) -> Answer<Value> {
        let mut shown = self.shown.lock().expect("the shown pages");

        if is_covered {
            shown.covered.insert(page_id.to_string());
        } else {
            shown.covered.remove(page_id);
        }

        apply_shown(app, &shown)
    }

    pub fn open_own_window(self: &Arc<Self>, app: &AppHandle<Wry>, page_id: &str, title: &str) -> Answer<Value> {
        let webview = self.webview(app, page_id)?;
        let label = format!("{OWN_WINDOW_LABEL_PREFIX}{}", policy::label_of(page_id)?);

        if let Some(window) = app.get_window(&label) {
            window.set_focus().map_err(failure_text)?;
            return Ok(Value::Null);
        }

        self.shown.lock().expect("the shown pages").own_windows.insert(page_id.to_string(), label.clone());

        match move_into_own_window(app, &webview, &label, title) {
            Ok(window) => {
                self.follow_own_window(app, &window, page_id);
                self.tell_facts(&webview, OWN_WINDOW_OPENED);
                Ok(Value::Null)
            }
            Err(failure) => {
                eprintln!("[browser] page {page_id} studio → own window {label} failed, rolling back: {failure}");
                self.roll_back_own_window(app, &webview, page_id, &label);
                Err(failure)
            }
        }
    }

    fn roll_back_own_window(&self, app: &AppHandle<Wry>, webview: &Webview<Wry>, page_id: &str, label: &str) {
        let placement = self.placement_of(page_id);
        let home = app.get_window(MAIN_WINDOW).ok_or_else(|| NO_WINDOW.to_string());
        let homed = home.and_then(|main| webview.reparent(&main).map_err(failure_text));
        let placed = homed.and_then(|_| place_webview(webview, placement));
        let mut shown = self.shown.lock().expect("the shown pages");
        shown.own_windows.remove(page_id);
        let applied = placed.and_then(|_| apply_shown(app, &shown));
        drop(shown);

        if let Err(failure) = applied {
            eprintln!("[browser] page {page_id} own window {label} → studio failed while rolling back: {failure}");
        }

        let Some(window) = app.get_window(label) else { return };

        if let Err(failure) = window.destroy() {
            eprintln!("[browser] page {page_id} own window {label} → left open while rolling back: {failure}");
        }
    }

    pub fn own_windows(&self) -> Answer<Value> {
        let shown = self.shown.lock().expect("the shown pages");
        Ok(json!(shown.own_windows.keys().collect::<Vec<_>>()))
    }

    pub fn focus_own_window(&self, app: &AppHandle<Wry>, page_id: &str) -> Answer<Value> {
        let label = self.shown.lock().expect("the shown pages").own_windows.get(page_id).cloned();
        let Some(window) = label.and_then(|label| app.get_window(&label)) else { return Ok(Value::Null) };
        window.set_focus().map(|_| Value::Null).map_err(failure_text)
    }

    fn follow_own_window(self: &Arc<Self>, app: &AppHandle<Wry>, window: &Window<Wry>, page_id: &str) {
        let pages = self.clone();
        let app = app.clone();
        let page = page_id.to_string();
        let held = window.clone();
        window.on_window_event(move |event| match event {
            WindowEvent::Resized(size) => {
                let scale = held.scale_factor().unwrap_or(1.0);
                if let Ok(webview) = pages.webview(&app, &page) {
                    let _ = fill_window(&webview, f64::from(size.width) / scale, f64::from(size.height) / scale);
                }
            }
            WindowEvent::CloseRequested { api, .. } => {
                let Err(failure) = pages.bring_home(&app, &page) else { return };

                if !pages.is_in_own_window(&page) {
                    eprintln!("[browser] page {page} own window → closed, back in the studio but not placed: {failure}");
                    return;
                }

                eprintln!("[browser] page {page} own window → kept open (bringing it home failed: {failure})");
                api.prevent_close();
            }
            _ => {}
        });
    }

    fn bring_home(self: &Arc<Self>, app: &AppHandle<Wry>, page_id: &str) -> Answer<Value> {
        if !self.is_in_own_window(page_id) {
            return Ok(Value::Null);
        }

        let Ok(webview) = self.webview(app, page_id) else {
            self.shown.lock().expect("the shown pages").own_windows.remove(page_id);
            eprintln!("[browser] page {page_id} own window → closed (its page is already gone)");
            return Ok(Value::Null);
        };
        let main = app.get_window(MAIN_WINDOW).ok_or(NO_WINDOW)?;
        webview.reparent(&main).map_err(failure_text)?;
        self.shown.lock().expect("the shown pages").own_windows.remove(page_id);
        self.tell_facts(&webview, OWN_WINDOW_CLOSED);
        place_webview(&webview, self.placement_of(page_id))?;
        apply_shown(app, &self.shown.lock().expect("the shown pages"))
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

fn move_into_own_window(app: &AppHandle<Wry>, webview: &Webview<Wry>, label: &str, title: &str) -> Answer<Window<Wry>> {
    let (x, y) = own_window_origin(app);
    let window = Window::builder(app, label)
        .title(title)
        .inner_size(OWN_WINDOW_WIDTH, OWN_WINDOW_HEIGHT)
        .position(x, y)
        .build()
        .map_err(failure_text)?;
    webview.reparent(&window).map_err(failure_text)?;
    fill_window(webview, OWN_WINDOW_WIDTH, OWN_WINDOW_HEIGHT)?;
    webview.show().map_err(failure_text)?;
    Ok(window)
}

fn blank_facts() -> Value {
    json!({ "url": BLANK, "title": "", "canGoBack": false, "canGoForward": false, "isLoading": false })
}

fn own_window_origin(app: &AppHandle<Wry>) -> (f64, f64) {
    let scale = app.get_window(MAIN_WINDOW).and_then(|window| window.scale_factor().ok()).unwrap_or(1.0);
    let Ok(cursor) = app.cursor_position() else { return (OWN_WINDOW_FALLBACK_AT, OWN_WINDOW_FALLBACK_AT) };
    (cursor.x / scale - OWN_WINDOW_WIDTH / 2.0, cursor.y / scale - OWN_WINDOW_GRAB_TOP)
}

fn fill_window(webview: &Webview<Wry>, width: f64, height: f64) -> Answer<Value> {
    place_webview(webview, Placement { x: 0.0, y: 0.0, width, height, corner: 0.0 })
}

fn place_webview(webview: &Webview<Wry>, placement: Placement) -> Answer<Value> {
    webview.set_position(placement.position()).map_err(failure_text)?;
    webview.set_size(placement.size()).map_err(failure_text)?;
    let _ = webview.with_webview(move |platform| webkit::round_bottom_corners(view_of(&platform), placement.corner));
    Ok(Value::Null)
}

fn apply_shown(app: &AppHandle<Wry>, shown: &Shown) -> Answer<Value> {
    let visible_labels: HashSet<String> =
        uncovered_pages(&shown.pages, &shown.covered).iter().map(|page| policy::label_of(page)).collect::<Answer<_>>()?;

    let own_window_labels: HashSet<String> = shown.own_windows.keys().map(|page| policy::label_of(page)).collect::<Answer<_>>()?;

    for webview in browser_webviews(app).into_iter().filter(|webview| !own_window_labels.contains(webview.label())) {
        let is_visible = visible_labels.contains(webview.label());
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
