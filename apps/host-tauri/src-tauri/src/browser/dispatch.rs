use super::drive;
use super::page_holes::Rect;
use super::pages::{Frame, Pages, Placement};
use super::site_icon;
use super::tear_off;
use super::tear_off_ghost;
use super::webkit::{self, ShotFormat, ShotRegion};
use serde_json::Value;
use std::str::FromStr;
use std::sync::Arc;
use tauri::ipc::{Channel, Invoke, InvokeBody, InvokeError, InvokeResponseBody, JavaScriptChannelId};
use crate::studio_caller::is_studio_label;
use tauri::{AppHandle, Manager, RunEvent, WindowEvent, Wry};

pub const STUDIO_WEBVIEW: &str = "main";

const MISSING_ARGUMENT: &str = "The call is missing its {name} argument.";
const NOT_A_CHANNEL: &str = "The call's onEvent argument is not a channel.";
const NOT_FROM_STUDIO: &str = "Only the studio may drive the browser.";
const UNKNOWN_FORMAT: &str = "A page picture is png or jpeg.";

type Answer = Result<Value, String>;

struct Call {
    app: AppHandle<Wry>,
    window: String,
    command: String,
    args: Value,
}

impl Call {
    fn argument(&self, name: &str) -> Result<&Value, String> {
        self.args.get(name).ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name))
    }

    fn text(&self, name: &str) -> Result<&str, String> {
        self.argument(name)?.as_str().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name))
    }

    fn flag(&self, name: &str) -> Result<bool, String> {
        self.argument(name)?.as_bool().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name))
    }

    fn page(&self) -> Result<&str, String> {
        self.text("page")
    }
}

fn ghost_lay_of(call: &Call) -> Result<tear_off_ghost::GhostLay, String> {
    let number = |name: &str| call.argument(name)?.as_f64().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name));
    Ok(tear_off_ghost::GhostLay {
        page: call.argument("page")?.clone(),
        width: number("width")?,
        height: number("height")?,
        anchor_x: number("anchorX")?,
        anchor_y: number("anchorY")?,
    })
}

const BOTH_BOTTOM_SIDES: u8 = 3;

fn placement_in(held: &Value) -> Result<Placement, String> {
    let side = |name: &str| held.get(name).and_then(Value::as_f64).ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name));
    let corner_sides = held.get("cornerSides").and_then(Value::as_u64).map_or(BOTH_BOTTOM_SIDES, |sides| (sides & 3) as u8);
    Ok(Placement { x: side("x")?, y: side("y")?, width: side("width")?, height: side("height")?, corner: side("corner")?, corner_sides })
}

fn frames_of(call: &Call) -> Result<Vec<Frame>, String> {
    let frames = call.argument("frames")?.as_array().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", "frames"))?;
    let frame_of = |held: &Value| -> Result<Frame, String> {
        let page = held.get("page").and_then(Value::as_str).ok_or_else(|| MISSING_ARGUMENT.replace("{name}", "page"))?;
        Ok(Frame { page: page.to_string(), placement: placement_in(held)? })
    };
    frames.iter().map(frame_of).collect()
}

fn holes_of(call: &Call) -> Result<Vec<Rect>, String> {
    let holes = call.argument("holes")?.as_array().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", "holes"))?;
    let hole_of = |held: &Value| -> Result<Rect, String> {
        let side = |name: &str| held.get(name).and_then(Value::as_f64).ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name));
        Ok(Rect { x: side("x")?, y: side("y")?, width: side("width")?, height: side("height")? })
    };
    holes.iter().map(hole_of).collect()
}

fn at_of(call: &Call) -> Result<Option<(f64, f64)>, String> {
    let Some(at) = call.args.get("at").filter(|at| !at.is_null()) else { return Ok(None) };
    let side = |name: &str| at.get(name).and_then(Value::as_f64).ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name));
    Ok(Some((side("x")?, side("y")?)))
}

fn region_of(call: &Call) -> Result<Option<ShotRegion>, String> {
    let Some(region) = call.args.get("region").filter(|region| !region.is_null()) else { return Ok(None) };
    let side = |name: &str| region.get(name).and_then(Value::as_f64).ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name));
    Ok(Some(ShotRegion { x: side("x")?, y: side("y")?, width: side("width")?, height: side("height")? }))
}

fn format_of(call: &Call) -> Result<ShotFormat, String> {
    match call.text("format")? {
        "png" => Ok(ShotFormat::Png),
        "jpeg" => Ok(ShotFormat::Jpeg),
        _ => Err(UNKNOWN_FORMAT.into()),
    }
}

fn answer_of(pages: &Arc<Pages>, call: &Call) -> Answer {
    let app = &call.app;

    match call.command.as_str() {
        "create" => pages.create(app, &call.window, call.page()?, call.text("profile")?),
        "close" => pages.close(app, call.page()?),
        "navigate" => pages.navigate(app, call.page()?, call.text("url")?),
        "back" => pages.step(app, call.page()?, webkit::go_back),
        "forward" => pages.step(app, call.page()?, webkit::go_forward),
        "reload" => pages.step(app, call.page()?, webkit::reload),
        "facts" => pages.facts(app, call.page()?),
        "appearance" => pages.wear_appearance(app, call.flag("dark")?),
        "place" => pages.place(app, call.page()?, placement_in(&call.args)?),
        "show" => pages.show(app, &call.window, frames_of(call)?),
        "cover" => pages.cover(app, call.page()?, call.flag("covered")?),
        "cut" => pages.cut(app, call.page()?, holes_of(call)?),
        "wear_frame" => pages.wear_frame(app, &call.window, call.text("colour")?),
        "open_own_window" => pages.open_own_window(app, call.page()?, call.text("title")?),
        "focus_own_window" => pages.focus_own_window(app, call.page()?),
        "own_windows" => pages.own_windows(),
        "standing_pages" => pages.standing_pages(),
        "open_own_window_at_cursor" => pages.open_own_window_at_cursor(app, call.page()?, call.text("title")?),
        "open_studio_window" => tear_off::open_studio_window(app, call.text("tab")?, at_of(call)?),
        "open_chat_window" => tear_off::open_chat_window(app, call.text("chat")?, at_of(call)?),
        "focus_window" => tear_off::focus_window(app, call.text("window")?),
        "lay_tear_off_ghost" => tear_off_ghost::lay(app, ghost_lay_of(call)?),
        "wear_tear_off_ghost" => tear_off_ghost::wear(app, call.argument("worn")?),
        "show_tear_off_ghost" => tear_off_ghost::show(app, call.flag("shown")?),
        "evaluate" => pages.evaluate(app, call.page()?, call.text("script")?.to_string()),
        "site_icon" => site_icon::site_icon(call.text("address")?, super::pages::user_agent()),
        "site_page_head" => site_icon::page_head(call.text("address")?, super::pages::user_agent()),
        "evaluate_frames" => pages.evaluate_in_frames(app, call.page()?, call.text("script")?.to_string()),
        command if drive::is_drive_command(command) => drive::answer(app, command, &call.args),
        unknown => Err(format!("The browser has no command {unknown}.")),
    }
}

fn body_of(pages: &Arc<Pages>, call: &Call) -> Result<InvokeResponseBody, String> {
    if call.command == "snapshot" {
        let bytes = pages.snapshot(&call.app, call.page()?, region_of(call)?, format_of(call)?)?;
        return Ok(InvokeResponseBody::Raw(bytes));
    }

    if call.command == "page_shot" {
        let bytes = pages.page_shot(&call.app, call.page()?, region_of(call)?)?;
        return Ok(InvokeResponseBody::Raw(bytes));
    }

    answer_of(pages, call).map(|value| InvokeResponseBody::Json(value.to_string()))
}

fn open(pages: &Pages, invoke_args: &Value, webview: &tauri::Webview<Wry>) -> Answer {
    let named = invoke_args.get("onEvent").and_then(Value::as_str).ok_or(NOT_A_CHANNEL)?;
    let id = JavaScriptChannelId::from_str(named).map_err(|_| NOT_A_CHANNEL.to_string())?;
    let channel: Channel<Value> = id.channel_on(webview.clone());
    pages.open(webview.label(), channel);
    Ok(Value::Bool(true))
}

pub fn handle(pages: &Arc<Pages>, invoke: Invoke<Wry>) -> bool {
    let Invoke { message, resolver, .. } = invoke;

    if !is_studio_label(message.webview().label()) {
        resolver.reject(NOT_FROM_STUDIO);
        return true;
    }

    let args = match message.payload() {
        InvokeBody::Json(args) => args.clone(),
        InvokeBody::Raw(_) => Value::Null,
    };

    if message.command() == "open" {
        tear_off_ghost::prepare(message.webview().app_handle());
        resolver.respond(open(pages, &args, &message.webview()).map_err(InvokeError::from));
        return true;
    }

    let call = Call {
        app: message.webview().app_handle().clone(),
        window: message.webview().label().to_string(),
        command: message.command().to_string(),
        args,
    };
    let pages = pages.clone();
    resolver.respond_async_serialized(async move {
        let done = tauri::async_runtime::spawn_blocking(move || body_of(&pages, &call)).await;
        done.map_err(|failure| failure.to_string()).and_then(|answer| answer).map_err(InvokeError::from)
    });
    true
}

pub fn on_run_event(pages: &Arc<Pages>, app: &AppHandle<Wry>, event: &RunEvent) {
    let RunEvent::WindowEvent { label, event, .. } = event else { return };

    if !is_studio_label(label) {
        return;
    }

    match event {
        WindowEvent::CloseRequested { .. } => pages.release_window(app, label),
        WindowEvent::Destroyed => pages.forget_window(label),
        _ => {}
    }
}
