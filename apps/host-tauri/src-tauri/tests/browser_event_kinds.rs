use widgetarium_host_tauri_lib::browser::pages::{OWN_WINDOW_CLOSED, OWN_WINDOW_OPENED, PAGE_MOVED, PAGE_PRESSED, WINDOW_CLOSED};

const STUDIO_EVENT_SCHEMA: &str = include_str!("../../../../packages/domain/browser/gateways/browser-pages/tauri/pages-bridge.ts");

fn main() {
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
