use serde_json::{json, Value};
use std::process::{Command, Stdio};

pub const MOST_ICON_BYTES: usize = 48 * 1024;
pub const NOT_A_WEB_ADDRESS: &str = "A site icon is fetched only over http or https.";

const CURL: &str = "/usr/bin/curl";
const FETCH_SECONDS: &str = "5";
const MOST_REDIRECTS: &str = "3";
const WEB_PROTOCOLS: &str = "=http,https";
const SNIFFED_TEXT: usize = 1024;
const CURL_HTTP_ERROR: i32 = 22;
const CURL_TOO_LARGE: i32 = 63;
const BASE64_LETTERS: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

pub fn is_web_address(address: &str) -> bool {
    let lowered = address.to_ascii_lowercase();
    (lowered.starts_with("https://") || lowered.starts_with("http://")) && !address.chars().any(char::is_whitespace)
}

pub fn image_type_of(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Some("image/png");
    }

    if bytes.starts_with(&[0, 0, 1, 0]) {
        return Some("image/x-icon");
    }

    if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        return Some("image/gif");
    }

    if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        return Some("image/jpeg");
    }

    if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        return Some("image/webp");
    }

    is_svg(bytes).then_some("image/svg+xml")
}

fn is_svg(bytes: &[u8]) -> bool {
    let head = String::from_utf8_lossy(&bytes[..bytes.len().min(SNIFFED_TEXT)]).to_ascii_lowercase();
    let mut rest = head.trim_start_matches('\u{feff}').trim_start();

    while let Some(after) = after_prolog(rest) {
        rest = after.trim_start();
    }

    rest.starts_with("<svg")
}

fn after_prolog(text: &str) -> Option<&str> {
    let (opening, closing) = [("<?", "?>"), ("<!--", "-->"), ("<!doctype svg", ">")].into_iter().find(|(opening, _)| text.starts_with(opening))?;
    let end = text[opening.len()..].find(closing)?;
    Some(&text[opening.len() + end + closing.len()..])
}

pub fn base64_of(bytes: &[u8]) -> String {
    let mut text = String::with_capacity(bytes.len().div_ceil(3) * 4);

    for chunk in bytes.chunks(3) {
        let joined = (u32::from(chunk[0]) << 16) | (u32::from(*chunk.get(1).unwrap_or(&0)) << 8) | u32::from(*chunk.get(2).unwrap_or(&0));
        let letters = [18, 12, 6, 0].map(|shift| BASE64_LETTERS[((joined >> shift) & 63) as usize] as char);
        text.push(letters[0]);
        text.push(letters[1]);
        text.push(if chunk.len() > 1 { letters[2] } else { '=' });
        text.push(if chunk.len() > 2 { letters[3] } else { '=' });
    }

    text
}

pub fn icon_of_bytes(bytes: &[u8]) -> Option<String> {
    if bytes.is_empty() || bytes.len() > MOST_ICON_BYTES {
        return None;
    }

    image_type_of(bytes).map(|kind| format!("data:{kind};base64,{}", base64_of(bytes)))
}

pub enum Fetched {
    Answered(Option<Vec<u8>>),
    Unreached,
}

// TRADE-OFF: the system curl, not NSURLSession: it caps time, size and protocols in flags, one process per uncached icon
fn fetched_bytes(address: &str, user_agent: &str) -> Fetched {
    let most_bytes = MOST_ICON_BYTES.to_string();
    let output = Command::new(CURL)
        .args(["--disable", "--silent", "--fail", "--location"])
        .args(["--max-redirs", MOST_REDIRECTS, "--max-time", FETCH_SECONDS, "--max-filesize", &most_bytes])
        .args(["--proto", WEB_PROTOCOLS, "--proto-redir", WEB_PROTOCOLS, "--user-agent", user_agent, "--", address])
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .output();
    let Ok(output) = output else { return Fetched::Unreached };

    match output.status.code() {
        Some(0) => Fetched::Answered(Some(output.stdout)),
        Some(CURL_HTTP_ERROR) | Some(CURL_TOO_LARGE) => Fetched::Answered(None),
        _ => Fetched::Unreached,
    }
}

pub fn site_icon(address: &str, user_agent: &str) -> Result<Value, String> {
    if !is_web_address(address) {
        return Err(NOT_A_WEB_ADDRESS.into());
    }

    Ok(answer_of(fetched_bytes(address, user_agent)))
}

pub fn answer_of(fetched: Fetched) -> Value {
    match fetched {
        Fetched::Answered(bytes) => json!({ "icon": bytes.and_then(|bytes| icon_of_bytes(&bytes)), "isReached": true }),
        Fetched::Unreached => json!({ "icon": null, "isReached": false }),
    }
}
