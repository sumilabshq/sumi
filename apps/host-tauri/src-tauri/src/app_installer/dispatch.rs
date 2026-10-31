use super::strict_json::strict_texts_of;
use super::AppInstaller;
use crate::studio_caller::refuse_foreign_caller;
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
    fn texts<const N: usize>(&self, names: [&str; N]) -> Result<[&str; N], String> {
        strict_texts_of(&self.args, names, &format!("the {} call", self.command))
    }
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
        "inspect" => call.texts(["path"]).and_then(|[path]| super::release::inspect(Path::new(path))),
        "install" => call
            .texts(["id", "path", "manifestSha256"])
            .and_then(|[id, path, manifest_sha256]| installer.install(id, Path::new(path), manifest_sha256)),
        "switch" => call.texts(["id", "version"]).and_then(|[id, version]| installer.switch(id, version)),
        "fail" => call.texts(["id", "version"]).and_then(|[id, version]| installer.fail(id, version)),
        "retry" => call.texts(["id", "version"]).and_then(|[id, version]| installer.retry(id, version)),
        _ => return None,
    };
    Some(answer)
}
