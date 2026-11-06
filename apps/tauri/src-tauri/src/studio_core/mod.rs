pub mod hub;
pub mod quit;

use crate::studio_caller::{is_shown_studio_label, refuse_foreign_caller, CORE_WINDOW};
use hub::CoreHub;
use quit::QuitFlushes;
use serde_json::Value;
use std::str::FromStr;
use std::sync::Arc;
use tauri::ipc::{Channel, Invoke, InvokeBody, InvokeError, InvokeMessage, JavaScriptChannelId};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{AppHandle, Emitter, EventTarget, Manager, RunEvent, Runtime, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub const PLUGIN_NAME: &str = "studio-core";

const CORE_URL: &str = "index.html?core=1";
const CHANGED_EVENT: &str = "studio-core-changed";
const SERVING_EVENT: &str = "studio-core-serving";
const WINDOW_CLOSED_EVENT: &str = "studio-core-window-closed";
const MISSING_ARGUMENT: &str = "The call is missing its {name} argument.";
const NOT_A_CHANNEL: &str = "The call's onCall argument is not a channel.";
const NOT_THE_CORE: &str = "Only the core window may serve or answer.";
const NO_HUB: &str = "The core link has not started.";

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_NAME)
        .invoke_handler(dispatch)
        .setup(|app, _api| {
            app.manage(Arc::new(CoreHub::new()));
            app.manage(Arc::new(QuitFlushes::default()));
            Ok(())
        })
        .on_event(|app, event| {
            if matches!(event, RunEvent::Ready) {
                quit::ask_macos_before_terminating(app);
                let app = app.clone();
                std::thread::spawn(move || open_core_window(&app));
            }
            follow_closed_window(app, event);
            quit::follow_exit_request(app, event);
        })
        .build()
}

fn open_core_window<R: Runtime>(app: &AppHandle<R>) {
    match WebviewWindowBuilder::new(app, CORE_WINDOW, WebviewUrl::App(CORE_URL.into())).visible(false).build() {
        Ok(_) => eprintln!("[studio-core] core window none → {CORE_WINDOW} (hidden)"),
        Err(failure) => eprintln!("[studio-core] core window none → none: {failure}"),
    }
}

fn follow_closed_window<R: Runtime>(app: &AppHandle<R>, event: &RunEvent) {
    let RunEvent::WindowEvent { label, event: WindowEvent::Destroyed, .. } = event else {
        return;
    };

    if !is_shown_studio_label(label) {
        return;
    }

    app.state::<Arc<QuitFlushes>>().gone(label);
    if let Err(failure) = app.emit_to(CORE_WINDOW, WINDOW_CLOSED_EVENT, label) {
        eprintln!("[studio-core] window {label} closed → the core was not told: {failure}");
    }

    if live_studio_windows(app).iter().all(|open| open == label) {
        eprintln!("[studio-core] the last studio window {label} closed → the app quits");
        app.exit(0);
    }
}

fn live_studio_windows<R: Runtime>(app: &AppHandle<R>) -> Vec<String> {
    app.windows().into_keys().filter(|open| is_shown_studio_label(open)).collect()
}

fn dispatch<R: Runtime>(invoke: Invoke<R>) -> bool {
    let Invoke { message, resolver, .. } = invoke;
    if let Err(refused) = refuse_foreign_caller(message.webview().label()) {
        resolver.reject(refused);
        return true;
    }

    if message.command() == "call" {
        match (hub_of(&message), json_args(&message).cloned()) {
            (Ok(hub), Some(call)) => {
                std::thread::spawn(move || resolver.respond(hub.ask_core(call).map_err(InvokeError::from)));
            }
            (Err(refused), _) => resolver.reject(refused),
            (_, None) => resolver.reject(missing("call")),
        }
        return true;
    }

    let answer = match message.command() {
        "serve" => serve(&message),
        "answer" => answer(&message),
        "changed" => changed(&message),
        "live_windows" => Ok(Value::from(live_studio_windows(message.webview().app_handle()))),
        "quit_listening" => {
            message.webview().app_handle().state::<Arc<QuitFlushes>>().listening(message.webview().label());
            Ok(Value::Null)
        }
        "flushed_before_quit" => {
            let is_saved = argument(&message, "isSaved").ok().and_then(Value::as_bool).unwrap_or(false);
            quit::heard_flushed(message.webview().app_handle(), message.webview().label(), is_saved);
            Ok(Value::Null)
        }
        _ => return false,
    };
    resolver.respond(answer.map_err(InvokeError::from));
    true
}

fn serve<R: Runtime>(message: &InvokeMessage<R>) -> Result<Value, String> {
    refuse_not_core(message)?;
    let named = argument(message, "onCall")?.as_str().ok_or(NOT_A_CHANNEL)?;
    let id = JavaScriptChannelId::from_str(named).map_err(|_| NOT_A_CHANNEL.to_string())?;
    let channel: Channel<Value> = id.channel_on(message.webview());
    hub_of(message)?.serve(channel);
    eprintln!("[studio-core] core none → serving");
    message.webview().app_handle().emit_filter(SERVING_EVENT, (), is_studio_window).map_err(|failure| failure.to_string())?;
    Ok(Value::Null)
}

fn answer<R: Runtime>(message: &InvokeMessage<R>) -> Result<Value, String> {
    refuse_not_core(message)?;
    let id = argument(message, "id")?.as_u64().ok_or_else(|| missing("id"))?;
    hub_of(message)?.answer(id, argument(message, "answer")?.clone());
    Ok(Value::Null)
}

fn changed<R: Runtime>(message: &InvokeMessage<R>) -> Result<Value, String> {
    refuse_not_core(message)?;
    let change = json_args(message).cloned().ok_or_else(|| missing("invalidated"))?;
    message.webview().app_handle().emit_filter(CHANGED_EVENT, &change, is_studio_window).map_err(|failure| failure.to_string())?;
    Ok(Value::Null)
}

fn is_studio_window(target: &EventTarget) -> bool {
    match target {
        EventTarget::Window { label }
        | EventTarget::Webview { label }
        | EventTarget::WebviewWindow { label }
        | EventTarget::AnyLabel { label } => is_shown_studio_label(label),
        _ => false,
    }
}

fn refuse_not_core<R: Runtime>(message: &InvokeMessage<R>) -> Result<(), String> {
    if message.webview().label() == CORE_WINDOW {
        return Ok(());
    }

    Err(NOT_THE_CORE.to_string())
}

fn hub_of<R: Runtime>(message: &InvokeMessage<R>) -> Result<Arc<CoreHub>, String> {
    let app = message.webview().app_handle().clone();
    let held = app.try_state::<Arc<CoreHub>>().ok_or(NO_HUB)?;
    Ok(held.inner().clone())
}

fn json_args<R: Runtime>(message: &InvokeMessage<R>) -> Option<&Value> {
    match message.payload() {
        InvokeBody::Json(args) => Some(args),
        InvokeBody::Raw(_) => None,
    }
}

fn argument<'a, R: Runtime>(message: &'a InvokeMessage<R>, name: &str) -> Result<&'a Value, String> {
    json_args(message).and_then(|args| args.get(name)).ok_or_else(|| missing(name))
}

fn missing(name: &str) -> String {
    MISSING_ARGUMENT.replace("{name}", name)
}
