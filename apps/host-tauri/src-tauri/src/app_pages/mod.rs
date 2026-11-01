pub mod paths;
pub mod scheme;

use serde_json::Value;
use std::path::PathBuf;
use tauri::http::{Request, Response};
use tauri::{Runtime, UriSchemeContext, UriSchemeResponder};

pub const REGISTERED_APPS: &str = include_str!("../../../../../packages/shared/app-registry/generated/registered-apps.json");

const MONOREPO_ROOT: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../..");

pub struct RegisteredBuild {
    pub id: String,
    pub build: String,
}

pub fn registered_builds(registry: &str) -> Vec<RegisteredBuild> {
    let Ok(read) = serde_json::from_str::<Value>(registry) else {
        return Vec::new();
    };
    let rows = read.get("apps").and_then(Value::as_array).cloned().unwrap_or_default();
    rows.iter()
        .filter_map(|row| {
            Some(RegisteredBuild {
                id: row.get("id")?.as_str()?.to_owned(),
                build: row.get("build")?.as_str()?.to_owned(),
            })
        })
        .collect()
}

// TODO: bundle the app builds; a packaged Sumi reads this checkout path, so its apps and web links draw nothing
pub fn apps_root() -> PathBuf {
    let root = PathBuf::from(MONOREPO_ROOT);
    root.canonicalize().unwrap_or(root)
}

pub fn serve_scheme<R: Runtime>(context: UriSchemeContext<'_, R>, request: Request<Vec<u8>>, responder: UriSchemeResponder) {
    let uri = request.uri().to_string();
    let webview_label = context.webview_label().to_owned();
    std::thread::spawn(move || {
        let answer = scheme::respond(&apps_root(), &registered_builds(REGISTERED_APPS), &webview_label, &uri);
        let mut response = Response::builder().status(answer.status);
        for (name, value) in answer.headers {
            response = response.header(name, value);
        }

        responder.respond(response.body(answer.body).unwrap_or_default());
    });
}
