use widgetarium_host_tauri_lib::browser::pages::{OWN_WINDOW_CLOSED, OWN_WINDOW_OPENED, PAGE_MOVED, PAGE_PRESSED, WINDOW_CLOSED};

const STUDIO_EVENT_SCHEMA: &str = include_str!("../../../../packages/domain/browser/gateways/browser-pages/tauri/pages-bridge.ts");

const NAVIGATION_PROXY: &str = include_str!("../src/browser/navigation_proxy.rs");

fn is_proxy_known_before_it_is_set() -> bool {
    let Some((_, install)) = NAVIGATION_PROXY.split_once("pub fn install") else { return false };
    let registered = install.find("borrow_mut().insert");
    let set = install.find("setNavigationDelegate");
    matches!((registered, set), (Some(registered), Some(set)) if registered < set)
}

fn main() {
    if !is_proxy_known_before_it_is_set() {
        println!("!!  the navigation proxy becomes the delegate before it knows its inner delegate: WebKit caches respondsToSelector then, so didCommit and didFinish never fire");
        std::process::exit(1);
    }

    println!("OK  the navigation proxy knows its inner delegate before WebKit asks which methods it answers");

    let unread: Vec<&str> = [OWN_WINDOW_OPENED, OWN_WINDOW_CLOSED, PAGE_PRESSED, PAGE_MOVED, WINDOW_CLOSED]
        .into_iter()
        .filter(|kind| !STUDIO_EVENT_SCHEMA.contains(&format!("\"{kind}\"")))
        .collect();

    for kind in &unread {
        println!("!!  the studio's PageEventSchema does not read the event kind {kind}");
    }

    if !unread.is_empty() {
        std::process::exit(1);
    }

    println!("OK  every own-window, press, move and window-closed event kind Rust sends is one the studio reads");
}
