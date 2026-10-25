use super::navigation_proxy::{self, FailedLoad, NavigationHooks, SubFrame};
use super::page_holes::Rect;
use super::page_pointer;
use super::page_press;
use super::policy::{self, PAGE_LABEL_PREFIX};
use super::studio_hit;
use super::tear_off::{self, TornWindow};
use super::webkit::{self, view_of, Answer, ShotFormat, ShotRegion};
use crate::studio_caller::is_shown_studio_label;
use objc2_web_kit::WKWebView;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::rc::Rc;
use std::sync::mpsc;
use std::sync::{Arc, Mutex, OnceLock};
use tauri::ipc::Channel;
use tauri::webview::{DownloadEvent, NewWindowResponse, PageLoadEvent, PermissionResponse};
use tauri::window::{Color, Window};
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Webview, WebviewBuilder, WebviewUrl, WindowEvent, Wry};

pub const NO_WINDOW: &str = "The studio window is not open, so the browser has nowhere to draw a page.";
pub const NO_PAGE: &str = "The browser holds no page \"{id}\".";
pub const REFUSED_ADDRESS: &str = "The browser opens only web pages, and \"{address}\" is not one.";
pub const NO_ANSWER: &str = "The page did not answer.";
pub const NOT_A_FRAME_COLOUR: &str = "A studio frame colour is #rrggbb, and \"{colour}\" is not one.";

const MAIN_WINDOW: &str = "main";
const OWN_WINDOW_LABEL_PREFIX: &str = "own-window-";
const OWN_WINDOW_WIDTH: f64 = 960.0;
const OWN_WINDOW_HEIGHT: f64 = 720.0;
const OWN_WINDOW_FALLBACK_AT: f64 = 120.0;
const OWN_WINDOW_GRAB_TOP: f64 = 20.0;
const TORN_WINDOW: TornWindow = TornWindow { width: OWN_WINDOW_WIDTH, height: OWN_WINDOW_HEIGHT, grab_top: OWN_WINDOW_GRAB_TOP };
const BLANK: &str = "about:blank";
pub const OWN_WINDOW_OPENED: &str = "own-window-opened";
pub const OWN_WINDOW_CLOSED: &str = "own-window-closed";
pub const PAGE_PRESSED: &str = "pressed";
pub const PAGE_HOVERED: &str = "hovered";
pub const PAGE_MOVED: &str = "moved";
pub const WINDOW_CLOSED: &str = "window-closed";
const SMALLEST_SIDE: f64 = 1.0;
const OPAQUE: u8 = 255;
const PARKED_X: f64 = -100_000.0;
static USER_AGENT: OnceLock<String> = OnceLock::new();

pub struct Placement {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub corner: f64,
    pub corner_sides: u8,
}

impl Clone for Placement {
    fn clone(&self) -> Self {
        Placement { ..*self }
    }
}

impl Copy for Placement {}

const UNPLACED: Placement = Placement { x: 0.0, y: 0.0, width: SMALLEST_SIDE, height: SMALLEST_SIDE, corner: 0.0, corner_sides: 0 };

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
    shown_in: HashMap<String, Vec<String>>,
    covered: HashSet<String>,
    own_windows: HashMap<String, String>,
}

impl Shown {
    fn empty() -> Self {
        Shown { placed: HashMap::new(), shown_in: HashMap::new(), covered: HashSet::new(), own_windows: HashMap::new() }
    }

    fn placement_of(&self, page_id: &str) -> Placement {
        self.placed.get(page_id).copied().unwrap_or(UNPLACED)
    }

    fn drawn_placement_of(&self, page_id: &str) -> Placement {
        let placement = self.placement_of(page_id);

        if self.covered.contains(page_id) {
            return Placement { x: PARKED_X, ..placement };
        }

        placement
    }
}

pub fn covered_on_arrival(was_shown: &[String], now_shown: &[String], covered: &HashSet<String>) -> Vec<String> {
    if !was_shown.iter().any(|page| covered.contains(page)) {
        return Vec::new();
    }

    now_shown.iter().filter(|page| !was_shown.contains(page)).cloned().collect()
}

pub fn parked_pages(shown_in: &HashMap<String, Vec<String>>, homes: &HashMap<String, String>, covered: &HashSet<String>) -> HashSet<String> {
    let mut parked = HashSet::new();

    for (window, shown) in shown_in {
        parked.extend(shown.iter().filter(|page| covered.contains(*page) && homes.get(*page) == Some(window)).cloned());
    }

    parked
}

pub fn uncovered_pages(shown: &[String], covered: &HashSet<String>) -> HashSet<String> {
    shown.iter().filter(|page| !covered.contains(*page)).cloned().collect()
}

pub fn visible_pages(shown_in: &HashMap<String, Vec<String>>, homes: &HashMap<String, String>, covered: &HashSet<String>) -> HashSet<String> {
    let mut visible = HashSet::new();

    for (window, shown) in shown_in {
        visible.extend(uncovered_pages(shown, covered).into_iter().filter(|page| homes.get(page) == Some(window)));
    }

    visible
}

pub fn pages_moving_into(window: &str, shown: &[String], homes: &HashMap<String, String>, own_windows: &HashMap<String, String>) -> Vec<String> {
    let is_elsewhere = |page: &&String| homes.get(*page).map(String::as_str) != Some(window) && !own_windows.contains_key(*page);
    shown.iter().filter(is_elsewhere).cloned().collect()
}

pub fn pages_standing_in(window: &str, homes: &HashMap<String, String>) -> Vec<String> {
    homes.iter().filter(|(_, home)| home.as_str() == window).map(|(page, _)| page.clone()).collect()
}

pub struct Pages {
    sinks: Mutex<HashMap<String, Channel<Value>>>,
    shown: Mutex<Shown>,
    homes: Mutex<HashMap<String, String>>,
    is_dark: Mutex<Option<bool>>,
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

fn appearance_word(is_dark: Option<bool>) -> &'static str {
    match is_dark {
        Some(true) => "dark",
        Some(false) => "light",
        None => "the system's",
    }
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
            sinks: Mutex::new(HashMap::new()),
            shown: Mutex::new(Shown::empty()),
            homes: Mutex::new(HashMap::new()),
            is_dark: Mutex::new(None),
        }
    }

    pub fn wear_appearance(&self, app: &AppHandle<Wry>, is_dark: bool) -> Answer<Value> {
        let was = self.is_dark.lock().expect("the pages' appearance").replace(is_dark);
        let pages = browser_webviews(app);
        eprintln!("[browser] pages' appearance {} → {} on {} pages (the studio's theme changed)", appearance_word(was), appearance_word(Some(is_dark)), pages.len());

        for webview in pages {
            let _ = webview.with_webview(move |platform| webkit::wear_appearance(view_of(&platform), is_dark));
        }

        Ok(Value::Null)
    }

    // TODO: close pages left from the previous start; the studio's first show only hides them
    pub fn open(&self, window: &str, sink: Channel<Value>) {
        let was = if self.sinks.lock().expect("the browser's event sinks").insert(window.to_string(), sink).is_some() { "listening" } else { "none" };
        eprintln!("[browser] studio {window} events {was} → listening (the studio started)");
        let standing = pages_standing_in(window, &self.homes_now());
        let mut shown = self.shown.lock().expect("the shown pages");
        let covered_before = shown.covered.len();
        shown.covered.retain(|page| !standing.contains(page));

        if shown.covered.len() != covered_before {
            eprintln!("[browser] covered pages {covered_before} → {} (a new start of studio {window} holds no cover)", shown.covered.len());
        }
    }

    fn homes_now(&self) -> HashMap<String, String> {
        self.homes.lock().expect("the pages' windows").clone()
    }

    fn window_of(&self, page_id: &str) -> Option<String> {
        self.homes.lock().expect("the pages' windows").get(page_id).cloned()
    }

    fn with_window(&self, page_id: &str, facts: Value) -> Value {
        let Value::Object(mut fields) = facts else { return facts };
        fields.insert("window".into(), json!(self.window_of(page_id)));
        Value::Object(fields)
    }

    fn told(&self, page_id: &str, kind: &str, facts: Value, failure: Value) {
        let facts = self.with_window(page_id, facts);
        self.tell_studios(json!({ "page": page_id, "kind": kind, "facts": facts, "failure": failure }));
    }

    fn tell_hovered(&self, page_id: &str, x: f64, y: f64) {
        let Some(window) = self.window_of(page_id) else { return };
        let event = json!({ "kind": PAGE_HOVERED, "page": page_id, "x": x, "y": y });

        if let Some(sink) = self.sinks.lock().expect("the browser's event sinks").get(&window) {
            let _ = sink.send(event);
        }
    }

    fn tell_studios(&self, event: Value) {
        for sink in self.sinks.lock().expect("the browser's event sinks").values() {
            let _ = sink.send(event.clone());
        }
    }

    fn webview(&self, app: &AppHandle<Wry>, page_id: &str) -> Answer<Webview<Wry>> {
        let label = policy::label_of(page_id)?;
        app.get_webview(&label).ok_or_else(|| NO_PAGE.replace("{id}", page_id))
    }

    fn placement_of(&self, page_id: &str) -> Placement {
        self.shown.lock().expect("the shown pages").placement_of(page_id)
    }

    pub fn create(self: &Arc<Self>, app: &AppHandle<Wry>, window_label: &str, page_id: &str, profile_id: &str) -> Answer<Value> {
        let label = policy::label_of(page_id)?;

        if app.get_webview(&label).is_some() {
            return Ok(Value::Null);
        }

        let window = app.get_window(window_label).ok_or(NO_WINDOW)?;
        let builder = self.builder(app, &label, profile_id)?;
        let placement = self.placement_of(page_id);
        let webview = window.add_child(builder, placement.position(), placement.size()).map_err(failure_text)?;
        self.homes.lock().expect("the pages' windows").insert(page_id.to_string(), window_label.to_string());
        webview.hide().map_err(failure_text)?;

        if let Some(is_dark) = *self.is_dark.lock().expect("the pages' appearance") {
            let _ = webview.with_webview(move |platform| webkit::wear_appearance(view_of(&platform), is_dark));
        }

        self.watch_navigation(&webview, page_id, placement)?;
        apply_shown(app, &self.shown.lock().expect("the shown pages"), &self.homes_now())
    }

    fn builder(self: &Arc<Self>, app: &AppHandle<Wry>, label: &str, profile_id: &str) -> Answer<WebviewBuilder<Wry>> {
        let blank = BLANK.parse().map_err(|_| NO_ANSWER)?;
        let loaded = self.clone();
        let titled = self.clone();
        let opener = app.clone();
        let opened_label = label.to_string();
        Ok(WebviewBuilder::new(label, WebviewUrl::External(blank))
            .data_store_identifier(policy::data_store_of(profile_id)?)
            .user_agent(user_agent())
            .accept_first_mouse(true)
            .on_navigation(|url| policy::may_navigate(url.as_str()))
            .on_page_load(move |webview, payload| loaded.tell_load(&webview, payload.event()))
            .on_document_title_changed(move |webview, _title| titled.tell_facts(&webview, "title"))
            .on_new_window(move |url, _features| opened_in_place(&opener, &opened_label, &url))
            .on_download(|_webview, event| !matches!(event, DownloadEvent::Requested { .. }))
            .on_permission_request(|_webview, _kind| PermissionResponse::Deny))
    }

    fn watch_navigation(self: &Arc<Self>, webview: &Webview<Wry>, page_id: &str, placement: Placement) -> Answer<()> {
        let started = self.clone();
        let failed = self.clone();
        let pressed = self.clone();
        let hovered = self.clone();
        let started_page = page_id.to_string();
        let failed_page = page_id.to_string();
        let pressed_page = page_id.to_string();
        on_main_thread(webview, move |view, answer| {
            webkit::round_bottom_corners(view, placement.corner, placement.corner_sides);
            let told = page_press::PageTold {
                pressed: Rc::new(move |page_id| pressed.told(page_id, PAGE_PRESSED, Value::Null, Value::Null)),
                hovered: Rc::new(move |page_id, x, y| hovered.tell_hovered(page_id, x, y)),
            };
            page_press::watch(view, &pressed_page, told);
            page_pointer::watch();
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
            page_press::forget(view);
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

    pub fn standing_pages(&self) -> Answer<Value> {
        let mut pages: Vec<String> = self.homes_now().into_keys().collect();
        pages.sort();
        Ok(json!(pages))
    }

    pub fn facts(&self, app: &AppHandle<Wry>, page_id: &str) -> Answer<Value> {
        let facts = on_main_thread(&self.webview(app, page_id)?, |view, answer| {
            let _ = answer.send(Ok(webkit::facts_of(view)));
        })?;
        Ok(self.with_window(page_id, facts))
    }

    fn forget(&self, page_id: &str) -> Option<String> {
        self.homes.lock().expect("the pages' windows").remove(page_id);
        let mut shown = self.shown.lock().expect("the shown pages");
        shown.placed.remove(page_id);

        for pages in shown.shown_in.values_mut() {
            pages.retain(|page| page != page_id);
        }

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

        let drawn = shown.drawn_placement_of(page_id);
        drop(shown);
        let Ok(webview) = self.webview(app, page_id) else { return Ok(Value::Null) };
        place_webview(&webview, drawn)
    }

    pub fn show(self: &Arc<Self>, app: &AppHandle<Wry>, window_label: &str, frames: Vec<Frame>) -> Answer<Value> {
        let pages: Vec<String> = frames.iter().map(|frame| frame.page.clone()).collect();
        let own_windows = self.shown.lock().expect("the shown pages").own_windows.clone();

        for page_id in pages_moving_into(window_label, &pages, &self.homes_now(), &own_windows) {
            self.move_into(app, window_label, &page_id)?;
        }

        let mut shown = self.shown.lock().expect("the shown pages");
        let was_shown = shown.shown_in.get(window_label).cloned().unwrap_or_default();
        let arriving_covered = covered_on_arrival(&was_shown, &pages, &shown.covered);

        if !arriving_covered.is_empty() {
            eprintln!("[browser] pages {} covered → parked (shown under an overlay in {window_label})", arriving_covered.join(", "));
        }

        shown.covered.extend(arriving_covered);
        shown.shown_in.insert(window_label.to_string(), pages);

        for frame in frames {
            let is_in_studio = !shown.own_windows.contains_key(&frame.page);
            shown.placed.insert(frame.page.clone(), frame.placement);

            if let (true, Ok(webview)) = (is_in_studio, self.webview(app, &frame.page)) {
                place_webview(&webview, shown.drawn_placement_of(&frame.page))?;
            }
        }

        apply_shown(app, &shown, &self.homes_now())
    }

    fn move_into(self: &Arc<Self>, app: &AppHandle<Wry>, window_label: &str, page_id: &str) -> Answer<()> {
        let Ok(webview) = self.webview(app, page_id) else { return Ok(()) };
        let window = app.get_window(window_label).ok_or(NO_WINDOW)?;
        let was = self.window_of(page_id).unwrap_or_else(|| "none".into());
        webview.reparent(&window).map_err(failure_text)?;
        self.homes.lock().expect("the pages' windows").insert(page_id.to_string(), window_label.to_string());
        self.shown.lock().expect("the shown pages").covered.remove(page_id);
        eprintln!("[browser] page {page_id} window {was} → {window_label} (shown there)");
        self.tell_facts(&webview, PAGE_MOVED);
        Ok(())
    }

    pub fn release_window(self: &Arc<Self>, app: &AppHandle<Wry>, window_label: &str) {
        let refuge = refuge_of(app, window_label);

        for page_id in pages_standing_in(window_label, &self.homes_now()) {
            self.homes.lock().expect("the pages' windows").remove(&page_id);
            self.shown.lock().expect("the shown pages").covered.remove(&page_id);
            let Ok(webview) = self.webview(app, &page_id) else { continue };
            let parked = webview.hide().and_then(|_| refuge.as_ref().map_or(Ok(()), |window| webview.reparent(window)));
            let refuge_label = refuge.as_ref().map_or("nowhere", |window| window.label());

            match parked {
                Ok(()) => eprintln!("[browser] page {page_id} window {window_label} → none (its studio window closed; kept hidden in {refuge_label})"),
                Err(failure) => eprintln!("[browser] page {page_id} window {window_label} → none, not kept in {refuge_label}: {failure}"),
            }

            self.tell_facts(&webview, PAGE_MOVED);
        }
    }

    pub fn forget_window(&self, window_label: &str) {
        let had_events = self.sinks.lock().expect("the browser's event sinks").remove(window_label).is_some();
        self.shown.lock().expect("the shown pages").shown_in.remove(window_label);
        let lost = pages_standing_in(window_label, &self.homes_now());
        self.homes.lock().expect("the pages' windows").retain(|_, home| home != window_label);

        if !lost.is_empty() {
            eprintln!("[browser] pages {} window {window_label} → none (closed with their window)", lost.join(", "));
        }

        eprintln!("[browser] studio {window_label} events {} → none (its window closed)", if had_events { "listening" } else { "none" });
        self.tell_studios(json!({ "kind": WINDOW_CLOSED, "window": window_label }));
    }

    pub fn cut(&self, app: &AppHandle<Wry>, page_id: &str, holes: Vec<Rect>) -> Answer<Value> {
        let webview = self.webview(app, page_id)?;
        on_main_thread(&webview, move |view, answer| {
            page_press::cut_holes(view, holes);
            let _ = answer.send(Ok(Value::Null));
        })
    }

    pub fn wear_frame(&self, app: &AppHandle<Wry>, window_label: &str, colour: &str) -> Answer<Value> {
        let (red, green, blue) = policy::rgb_of_hex(colour).ok_or_else(|| NOT_A_FRAME_COLOUR.replace("{colour}", colour))?;
        let window = app.get_window(window_label).ok_or(NO_WINDOW)?;
        window.set_background_color(Some(Color(red, green, blue, OPAQUE))).map_err(failure_text)?;

        if let Some(studio) = app.get_webview(window_label) {
            studio.set_background_color(Some(Color(0, 0, 0, 0))).map_err(failure_text)?;
            let _ = studio.with_webview(|platform| studio_hit::let_pages_take_their_pointer(view_of(&platform)));
        }

        eprintln!("[browser] studio {window_label} frame → {colour} (the studio is see-through over its pages)");
        Ok(Value::Null)
    }

    pub fn cover(&self, app: &AppHandle<Wry>, page_id: &str, is_covered: bool) -> Answer<Value> {
        let mut shown = self.shown.lock().expect("the shown pages");

        if is_covered {
            shown.covered.insert(page_id.to_string());
        } else {
            shown.covered.remove(page_id);
        }

        apply_shown(app, &shown, &self.homes_now())
    }

    pub fn open_own_window(self: &Arc<Self>, app: &AppHandle<Wry>, page_id: &str, title: &str) -> Answer<Value> {
        self.open_own_window_from(app, page_id, title, own_window_origin(app))
    }

    pub fn open_own_window_at_cursor(self: &Arc<Self>, app: &AppHandle<Wry>, page_id: &str, title: &str) -> Answer<Value> {
        let Some(origin) = tear_off::origin_at_cursor(app, &TORN_WINDOW)? else {
            eprintln!("[browser] page {page_id} studio → studio (the drag ended inside the studio window)");
            return Ok(Value::Bool(false));
        };

        self.open_own_window_from(app, page_id, title, origin)?;
        eprintln!("[browser] page {page_id} studio → own window at {:.0},{:.0} (released outside the studio)", origin.x, origin.y);
        Ok(Value::Bool(true))
    }

    fn open_own_window_from(self: &Arc<Self>, app: &AppHandle<Wry>, page_id: &str, title: &str, origin: LogicalPosition<f64>) -> Answer<Value> {
        let webview = self.webview(app, page_id)?;
        let label = format!("{OWN_WINDOW_LABEL_PREFIX}{}", policy::label_of(page_id)?);

        if let Some(window) = app.get_window(&label) {
            window.set_focus().map_err(failure_text)?;
            return Ok(Value::Null);
        }

        self.shown.lock().expect("the shown pages").own_windows.insert(page_id.to_string(), label.clone());

        match move_into_own_window(app, &webview, OwnWindowLaid { label: &label, title, origin }) {
            Ok(window) => {
                self.homes.lock().expect("the pages' windows").remove(page_id);
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
        self.homes.lock().expect("the pages' windows").insert(page_id.to_string(), MAIN_WINDOW.to_string());
        let mut shown = self.shown.lock().expect("the shown pages");
        shown.own_windows.remove(page_id);
        let applied = placed.and_then(|_| apply_shown(app, &shown, &self.homes_now()));
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
        self.homes.lock().expect("the pages' windows").insert(page_id.to_string(), MAIN_WINDOW.to_string());
        self.shown.lock().expect("the shown pages").own_windows.remove(page_id);
        self.tell_facts(&webview, OWN_WINDOW_CLOSED);
        place_webview(&webview, self.placement_of(page_id))?;
        apply_shown(app, &self.shown.lock().expect("the shown pages"), &self.homes_now())
    }

    pub fn snapshot(&self, app: &AppHandle<Wry>, page_id: &str, region: Option<ShotRegion>, format: ShotFormat) -> Answer<Vec<u8>> {
        on_main_thread(&self.webview(app, page_id)?, move |view, answer| {
            let (answered, failure_answer) = answer_once(answer);

            if let Err(failure) = webkit::snapshot(view, region, format, answered) {
                let _ = failure_answer.send(Err(failure));
            }
        })
    }

    pub fn page_shot(&self, app: &AppHandle<Wry>, page_id: &str, region: Option<ShotRegion>) -> Answer<Vec<u8>> {
        on_main_thread(&self.webview(app, page_id)?, move |view, answer| {
            let (answered, failure_answer) = answer_once(answer);

            if let Err(failure) = webkit::page_shot(view, region, answered) {
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

struct OwnWindowLaid<'a> {
    label: &'a str,
    title: &'a str,
    origin: LogicalPosition<f64>,
}

fn move_into_own_window(app: &AppHandle<Wry>, webview: &Webview<Wry>, laid: OwnWindowLaid) -> Answer<Window<Wry>> {
    let window = Window::builder(app, laid.label)
        .title(laid.title)
        .inner_size(OWN_WINDOW_WIDTH, OWN_WINDOW_HEIGHT)
        .position(laid.origin.x, laid.origin.y)
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

fn own_window_origin(app: &AppHandle<Wry>) -> LogicalPosition<f64> {
    let scale = app.get_window(MAIN_WINDOW).and_then(|window| window.scale_factor().ok()).unwrap_or(1.0);
    let Ok(cursor) = app.cursor_position() else { return LogicalPosition::new(OWN_WINDOW_FALLBACK_AT, OWN_WINDOW_FALLBACK_AT) };
    LogicalPosition::new(cursor.x / scale - OWN_WINDOW_WIDTH / 2.0, cursor.y / scale - OWN_WINDOW_GRAB_TOP)
}

fn fill_window(webview: &Webview<Wry>, width: f64, height: f64) -> Answer<Value> {
    place_webview(webview, Placement { x: 0.0, y: 0.0, width, height, corner: 0.0, corner_sides: 0 })
}

fn place_webview(webview: &Webview<Wry>, placement: Placement) -> Answer<Value> {
    webview.set_position(placement.position()).map_err(failure_text)?;
    webview.set_size(placement.size()).map_err(failure_text)?;
    let _ = webview.with_webview(move |platform| webkit::round_bottom_corners(view_of(&platform), placement.corner, placement.corner_sides));
    Ok(Value::Null)
}

fn refuge_of(app: &AppHandle<Wry>, closing: &str) -> Option<Window<Wry>> {
    let others = app.windows().into_iter().filter(|(label, _)| label != closing && is_shown_studio_label(label));
    let mut refuges: Vec<(String, Window<Wry>)> = others.collect();
    refuges.sort_by_key(|(label, _)| label != MAIN_WINDOW);
    refuges.into_iter().next().map(|(_, window)| window)
}

fn apply_shown(app: &AppHandle<Wry>, shown: &Shown, homes: &HashMap<String, String>) -> Answer<Value> {
    let visible = visible_pages(&shown.shown_in, homes, &shown.covered);
    let parked = parked_pages(&shown.shown_in, homes, &shown.covered);
    let in_studio = |webview: &Webview<Wry>| !shown.own_windows.contains_key(page_id_of(webview.label()));

    for webview in browser_webviews(app).into_iter().filter(in_studio) {
        let page_id = page_id_of(webview.label());

        if !visible.contains(page_id) && !parked.contains(page_id) {
            webview.hide().map_err(failure_text)?;
            continue;
        }

        webview.set_position(shown.drawn_placement_of(page_id).position()).map_err(failure_text)?;
        webview.show().map_err(failure_text)?;
        let _ = webview.with_webview(|platform| page_press::keep_under_studio(view_of(&platform)));
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

fn user_agent() -> &'static str {
    USER_AGENT.get_or_init(|| {
        let version = webkit::safari_version();

        if version.is_none() {
            eprintln!("[widgetarium] Safari version unread, pages say Safari {}", policy::SAFARI_VERSION_UNREAD);
        }

        policy::user_agent_of(version.as_deref())
    })
}
