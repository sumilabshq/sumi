use super::paths::{checked_app_id, checked_version, is_plain_file, is_plain_folder, path_in};
use crate::studio_caller::is_studio_label;
use std::fs;
use std::path::{Path, PathBuf};

pub const SCHEME: &str = "sumi-app";
pub const FRAME_POLICY: &str = include_str!("frame-policy.txt");
pub const SERVED_APP: &str = "{app}";

const SCHEME_PREFIX: &str = "sumi-app://";
const NOT_FOUND: &[u8] = b"not found";
const OCTET_STREAM: &str = "application/octet-stream";
const CONTENT_TYPES: [(&str, &str); 22] = [
    ("html", "text/html; charset=utf-8"),
    ("js", "text/javascript; charset=utf-8"),
    ("mjs", "text/javascript; charset=utf-8"),
    ("css", "text/css; charset=utf-8"),
    ("json", "application/json"),
    ("map", "application/json"),
    ("txt", "text/plain; charset=utf-8"),
    ("svg", "image/svg+xml"),
    ("png", "image/png"),
    ("jpg", "image/jpeg"),
    ("jpeg", "image/jpeg"),
    ("gif", "image/gif"),
    ("webp", "image/webp"),
    ("avif", "image/avif"),
    ("ico", "image/x-icon"),
    ("woff", "font/woff"),
    ("woff2", "font/woff2"),
    ("ttf", "font/ttf"),
    ("otf", "font/otf"),
    ("wasm", "application/wasm"),
    ("mp4", "video/mp4"),
    ("webm", "video/webm"),
];

pub struct SchemeAnswer {
    pub status: u16,
    pub headers: Vec<(&'static str, String)>,
    pub body: Vec<u8>,
}

pub fn frame_policy(app: &str) -> String {
    FRAME_POLICY.trim().replace(SERVED_APP, app)
}

pub fn respond(apps: &Path, webview_label: &str, uri: &str) -> SchemeAnswer {
    if !is_studio_label(webview_label) {
        return not_found();
    }

    let Some((app, file)) = served_file(apps, uri) else {
        return not_found();
    };
    let Ok(body) = fs::read(&file) else {
        return not_found();
    };
    SchemeAnswer {
        status: 200,
        headers: vec![
            ("Content-Type", content_type_of(&file).to_owned()),
            // TRADE-OFF: any origin, because an opaque-origin frame needs CORS for module scripts; cross-app fetch is stopped by CSP, not CORS.
            ("Access-Control-Allow-Origin", "*".to_owned()),
            ("Content-Security-Policy", frame_policy(&app)),
            ("X-Content-Type-Options", "nosniff".to_owned()),
        ],
        body,
    }
}

pub fn not_found() -> SchemeAnswer {
    SchemeAnswer {
        status: 404,
        headers: vec![
            ("Content-Type", "text/plain; charset=utf-8".to_owned()),
            ("Access-Control-Allow-Origin", "*".to_owned()),
        ],
        body: NOT_FOUND.to_vec(),
    }
}

fn served_file(apps: &Path, uri: &str) -> Option<(String, PathBuf)> {
    let address = uri.strip_prefix(SCHEME_PREFIX)?;
    let address = address.split(['?', '#']).next()?;
    let decoded = percent_decoded(address)?;
    let mut parts = decoded.splitn(3, '/');
    let id = checked_app_id(parts.next()?).ok()?;
    let version = checked_version(parts.next()?).ok()?;
    let version_folder = apps.join(id).join(version);
    if !is_plain_folder(&apps.join(id)) || !is_plain_folder(&version_folder) {
        return None;
    }

    let file = path_in(&version_folder, parts.next()?).ok()?;
    is_plain_file(&file).then(|| (id.to_owned(), file))
}

fn percent_decoded(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] != b'%' {
            decoded.push(bytes[index]);
            index += 1;
            continue;
        }

        let hex = std::str::from_utf8(bytes.get(index + 1..index + 3)?).ok()?;
        decoded.push(u8::from_str_radix(hex, 16).ok()?);
        index += 3;
    }

    String::from_utf8(decoded).ok()
}

fn content_type_of(file: &Path) -> &'static str {
    let extension = file.extension().and_then(|extension| extension.to_str()).unwrap_or_default().to_ascii_lowercase();
    CONTENT_TYPES.iter().find(|(known, _)| *known == extension).map_or(OCTET_STREAM, |(_, content_type)| content_type)
}
