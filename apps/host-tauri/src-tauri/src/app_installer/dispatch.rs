use super::decode::decode_value;
use super::AppInstaller;
use crate::studio_caller::refuse_foreign_caller;
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::Value;
use std::path::Path;
use tauri::ipc::{Invoke, InvokeBody, InvokeError};
use tauri::{Manager, Runtime};

const NO_APP_INSTALLER: &str = "the app installer has not started";

pub struct Call {
    command: String,
    args: Value,
}

impl Call {
    fn args<T: DeserializeOwned>(&self) -> Result<T, String> {
        decode_value(&self.args, &format!("the {} call", self.command))
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct PathArgs {
    path: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct InstallArgs {
    id: String,
    path: String,
    manifest_sha256: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct VersionArgs {
    id: String,
    version: String,
}

pub fn call_of(command: &str, args: Value) -> Call {
    Call {
        command: command.to_owned(),
        args,
    }
}

pub fn handle<R: Runtime>(invoke: Invoke<R>) -> bool {
    let Invoke { message, resolver, .. } = invoke;
    if let Err(refused) = refuse_foreign_caller(message.webview().label()) {
        resolver.reject(refused);
        return true;
    }

    let app = message.webview().app_handle().clone();
    let args = match message.payload() {
        InvokeBody::Json(args) => args.clone(),
        InvokeBody::Raw(_) => Value::Null,
    };
    let call = call_of(message.command(), args);
    resolver.respond_async(async move {
        let done = tauri::async_runtime::spawn_blocking(move || {
            let installer = app.try_state::<AppInstaller>().ok_or_else(|| NO_APP_INSTALLER.to_owned())?;
            answer_of(&installer, &call).unwrap_or_else(|| Err(format!("the app installer has no {} command", call.command)))
        })
        .await;
        done.map_err(|failure| failure.to_string()).and_then(|answer| answer).map_err(InvokeError::from)
    });
    true
}

pub fn answer_of(installer: &AppInstaller, call: &Call) -> Option<Result<Value, String>> {
    let answer = match call.command.as_str() {
        "registry" => installer.registry(),
        "installed" => installer.installed(),
        "inspect" => call.args().and_then(|args: PathArgs| super::release::inspect(Path::new(&args.path))),
        "install" => call
            .args()
            .and_then(|args: InstallArgs| installer.install(&args.id, Path::new(&args.path), &args.manifest_sha256)),
        "switch" => call.args().and_then(|args: VersionArgs| installer.switch(&args.id, &args.version)),
        "fail" => call.args().and_then(|args: VersionArgs| installer.fail(&args.id, &args.version)),
        "retry" => call.args().and_then(|args: VersionArgs| installer.retry(&args.id, &args.version)),
        _ => return None,
    };
    Some(answer)
}
