use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::process::ExitCode;
use std::thread;
use widgetarium_host_tauri_lib::browser::site_icon::{base64_of, icon_of_bytes, image_type_of, is_web_address, page_head, site_icon, MOST_ICON_BYTES, MOST_PAGE_BYTES};

const PNG: &[u8] = b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR";
const ICO: &[u8] = &[0, 0, 1, 0, 1, 0, 16, 16];
const SVG: &[u8] = b"<?xml version=\"1.0\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\"/>";
const HTML: &[u8] = b"<!doctype html><html><body><svg></svg></body></html>";
const COMMENTED_HTML: &[u8] = b"<!-- x --><html><svg></svg></html>";
const COMMENTED_SVG: &[u8] = b"\xef\xbb\xbf<?xml version=\"1.0\"?><!-- logo --><!DOCTYPE svg PUBLIC \"-\"><svg/>";
const AGENT: &str = "widgetarium-test";

struct Checks {
    failed: usize,
}

impl Checks {
    fn check<T: PartialEq + std::fmt::Debug>(&mut self, what: &str, got: T, wanted: T) {
        let ok = got == wanted;

        if !ok {
            self.failed += 1;
        }

        let verdict = if ok { "OK  " } else { "!!  " };
        let detail = if ok { String::new() } else { format!("  got {got:?}, want {wanted:?}") };
        println!("{verdict}{what}{detail}");
    }
}

fn sniffing(checks: &mut Checks) {
    checks.check("a png is a png", image_type_of(PNG), Some("image/png"));
    checks.check("an ico is an icon", image_type_of(ICO), Some("image/x-icon"));
    checks.check("an svg is an svg", image_type_of(SVG), Some("image/svg+xml"));
    checks.check("an html error page is no image", image_type_of(HTML), None);
    checks.check("html behind a comment holding an svg is no image", image_type_of(COMMENTED_HTML), None);
    checks.check("an svg behind a prolog, comment and doctype is an svg", image_type_of(COMMENTED_SVG), Some("image/svg+xml"));
    checks.check("plain text is no image", image_type_of(b"not found"), None);
    checks.check("base64 pads one byte", base64_of(b"M"), "TQ==".to_string());
    checks.check("base64 pads two bytes", base64_of(b"Ma"), "TWE=".to_string());
    checks.check("base64 of three bytes", base64_of(b"Man"), "TWFu".to_string());
    checks.check("an icon over the cap is refused", icon_of_bytes(&vec![0x89; MOST_ICON_BYTES + 1]), None);
    checks.check("an icon becomes a data url", icon_of_bytes(b"GIF89a").as_deref(), Some("data:image/gif;base64,R0lGODlh"));
}

fn addresses(checks: &mut Checks) {
    checks.check("https is fetched", is_web_address("https://example.com/favicon.ico"), true);
    checks.check("file is refused", is_web_address("file:///etc/passwd"), false);
    checks.check("data is not fetched", is_web_address("data:image/png;base64,AA"), false);
    checks.check("a spaced address is refused", is_web_address("https://a b/"), false);
    checks.check("a refused address answers an error", site_icon("file:///etc/hosts", AGENT).is_err(), true);
}

struct Served {
    status: &'static str,
    headers: &'static str,
    body: Vec<u8>,
}

fn answer(status: &'static str, body: &[u8]) -> Served {
    Served { status, headers: "", body: body.to_vec() }
}

fn served(answers: Vec<(&'static str, &'static [u8])>) -> String {
    served_with(answers.into_iter().map(|(status, body)| answer(status, body)).collect())
}

fn served_with(answers: Vec<Served>) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").expect("a local port");
    let at = listener.local_addr().expect("its address");
    thread::spawn(move || {
        for (stream, served) in listener.incoming().zip(answers) {
            let Ok(mut stream) = stream else { continue };
            let mut asked = [0u8; 2048];
            let _ = stream.read(&mut asked);
            let head = format!("HTTP/1.1 {}\r\n{}Content-Length: {}\r\nConnection: close\r\n\r\n", served.status, served.headers, served.body.len());
            let _ = stream.write_all(head.as_bytes());
            let _ = stream.write_all(&served.body);
        }
    });
    format!("http://{at}")
}

fn html(status: &'static str, body: &[u8]) -> Served {
    Served { status, headers: "Content-Type: text/html; charset=utf-8\r\n", body: body.to_vec() }
}

fn head_field(answer: &Value, field: &str) -> Value {
    answer.get(field).cloned().unwrap_or(Value::Null)
}

fn page_heads(checks: &mut Checks) {
    let linked = b"<html><head><link rel=\"icon\" href=\"/i.svg\"></head><body>hello</body></html>";
    let site = served_with(vec![html("200 OK", linked)]);
    let read = page_head(&format!("{site}/"), AGENT).unwrap_or(Value::Null);
    checks.check("a page's head comes back cut before </head>", head_field(&read, "head"), json!("<html><head><link rel=\"icon\" href=\"/i.svg\">"));
    checks.check("a read page is reached", head_field(&read, "isReached"), json!(true));

    let moved = Served { status: "302 Found", headers: "Location: /home\r\n", body: Vec::new() };
    let site = served_with(vec![moved, html("200 OK", b"<head><link rel=icon href=a.png></head>")]);
    let read = page_head(&format!("{site}/"), AGENT).unwrap_or(Value::Null);
    checks.check("a redirect answers the page it landed on", head_field(&read, "page"), json!(format!("{site}/home")));

    let site = served_with(vec![html("404 Not Found", b"<head></head>")]);
    let read = page_head(&format!("{site}/"), AGENT).unwrap_or(Value::Null);
    checks.check("a 404 page is reached with no head", (head_field(&read, "head"), head_field(&read, "isReached")), (Value::Null, json!(true)));

    let mut large = b"<head><link rel=icon href=/big.png>".to_vec();
    large.extend(std::iter::repeat_n(b' ', MOST_PAGE_BYTES * 2));
    let site = served_with(vec![Served { status: "200 OK", headers: "Content-Type: text/html\r\n", body: large }]);
    let read = page_head(&format!("{site}/"), AGENT).unwrap_or(Value::Null);
    let head = head_field(&read, "head");
    let head_text = head.as_str().unwrap_or("");
    checks.check("a page over the cap is read up to the cap", (head_text.len(), head_text.starts_with("<head><link")), (MOST_PAGE_BYTES, true));

    let site = served_with(vec![answer("200 OK", PNG)]);
    let read = page_head(&format!("{site}/"), AGENT).unwrap_or(Value::Null);
    checks.check("an answer that is no html has no head", (head_field(&read, "head"), head_field(&read, "isReached")), (Value::Null, json!(true)));

    let read = page_head("http://127.0.0.1:9/", AGENT).unwrap_or(Value::Null);
    checks.check("a closed port leaves the page unreached", head_field(&read, "isReached"), json!(false));
    checks.check("a page head is fetched only over the web", page_head("file:///etc/hosts", AGENT).is_err(), true);
}

fn fetching(checks: &mut Checks) {
    let site = served(vec![("200 OK", PNG), ("404 Not Found", PNG), ("200 OK", HTML)]);
    let icon = |path: &str| site_icon(&format!("{site}{path}"), AGENT).unwrap_or(Value::Null);
    let png = format!("data:image/png;base64,{}", base64_of(PNG));
    checks.check("a served png comes back as a data url", icon("/icon.png"), json!({ "icon": png, "isReached": true }));
    checks.check("a 404 comes back as an answered no icon", icon("/missing.ico"), json!({ "icon": null, "isReached": true }));
    checks.check("an html page comes back as an answered no icon", icon("/favicon.ico"), json!({ "icon": null, "isReached": true }));
    checks.check("a closed port comes back unreached", site_icon("http://127.0.0.1:9/x.ico", AGENT).unwrap_or(Value::Null), json!({ "icon": null, "isReached": false }));
}

fn main() -> ExitCode {
    let mut checks = Checks { failed: 0 };
    sniffing(&mut checks);
    addresses(&mut checks);
    fetching(&mut checks);
    page_heads(&mut checks);

    if checks.failed > 0 {
        println!("{} site icon check(s) failed", checks.failed);
        return ExitCode::FAILURE;
    }

    ExitCode::SUCCESS
}
