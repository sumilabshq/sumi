use super::drive;
use super::pages::{Pages, Placement};
use super::webkit::{self, ShotFormat, ShotRegion};
use serde_json::Value;
use std::str::FromStr;
use std::sync::Arc;
use tauri::ipc::{Channel, Invoke, InvokeBody, InvokeError, InvokeResponseBody, JavaScriptChannelId};
use tauri::{AppHandle, Manager, Wry};

pub const STUDIO_WEBVIEW: &str = "main";

const MISSING_ARGUMENT: &str = "The call is missing its {name} argument.";
const NOT_A_CHANNEL: &str = "The call's onEvent argument is not a channel.";
const NOT_FROM_STUDIO: &str = "Only the studio may drive the browser.";
const UNKNOWN_FORMAT: &str = "A page picture is png or jpeg.";

type Answer = Result<Value, String>;

struct Call {
    app: AppHandle<Wry>,
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

    fn number(&self, name: &str) -> Result<f64, String> {
        self.argument(name)?.as_f64().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name))
    }

    fn flag(&self, name: &str) -> Result<bool, String> {
        self.argument(name)?.as_bool().ok_or_else(|| MISSING_ARGUMENT.replace("{name}", name))
    }

    fn page(&self) -> Result<&str, String> {
        self.text("page")
    }
}

fn placement_of(call: &Call) -> Result<Placement, String> {
    Ok(Placement {
        x: call.number("x")?,
        y: call.number("y")?,
        width: call.number("width")?,
        height: call.number("height")?,
        corner: call.number("corner")?,
    })
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

fn shown_page_of(call: &Call) -> Option<String> {
    call.args.get("page").and_then(Value::as_str).map(str::to_string)
}

fn answer_of(pages: &Arc<Pages>, call: &Call) -> Answer {
    let app = &call.app;

    match call.command.as_str() {
        "create" => pages.create(app, call.page()?, call.text("profile")?),
        "close" => pages.close(app, call.page()?),
        "navigate" => pages.navigate(app, call.page()?, call.text("url")?),
        "back" => pages.step(app, call.page()?, webkit::go_back),
        "forward" => pages.step(app, call.page()?, webkit::go_forward),
        "reload" => pages.step(app, call.page()?, webkit::reload),
        "facts" => pages.facts(app, call.page()?),
        "place" => pages.place(app, placement_of(call)?),
        "show" => pages.show(app, shown_page_of(call)),
        "cover" => pages.cover(app, call.flag("covered")?),
        "evaluate" => pages.evaluate(app, call.page()?, call.text("script")?.to_string()),
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

    answer_of(pages, call).map(|value| InvokeResponseBody::Json(value.to_string()))
}

fn open(pages: &Pages, invoke_args: &Value, webview: &tauri::Webview<Wry>) -> Answer {
    let named = invoke_args.get("onEvent").and_then(Value::as_str).ok_or(NOT_A_CHANNEL)?;
    let id = JavaScriptChannelId::from_str(named).map_err(|_| NOT_A_CHANNEL.to_string())?;
    let channel: Channel<Value> = id.channel_on(webview.clone());
    pages.open(channel);
    Ok(Value::Bool(true))
}

pub fn handle(pages: &Arc<Pages>, invoke: Invoke<Wry>) -> bool {
    let Invoke { message, resolver, .. } = invoke;

    if message.webview().label() != STUDIO_WEBVIEW {
        resolver.reject(NOT_FROM_STUDIO);
        return true;
    }

    let args = match message.payload() {
        InvokeBody::Json(args) => args.clone(),
        InvokeBody::Raw(_) => Value::Null,
    };

    if message.command() == "open" {
        resolver.respond(open(pages, &args, &message.webview()).map_err(InvokeError::from));
        return true;
    }

    let call = Call { app: message.webview().app_handle().clone(), command: message.command().to_string(), args };
    let pages = pages.clone();
    resolver.respond_async_serialized(async move {
        let done = tauri::async_runtime::spawn_blocking(move || body_of(&pages, &call)).await;
        done.map_err(|failure| failure.to_string()).and_then(|answer| answer).map_err(InvokeError::from)
    });
    true
}
