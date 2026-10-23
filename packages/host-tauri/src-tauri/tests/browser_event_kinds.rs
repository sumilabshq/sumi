use widgetarium_host_tauri_lib::browser::pages::{OWN_WINDOW_CLOSED, OWN_WINDOW_OPENED};

const STUDIO_EVENT_SCHEMA: &str = include_str!("../../../browser/gateways/browser-pages/tauri/pages-bridge.ts");

fn main() {
    let unread: Vec<&str> = [OWN_WINDOW_OPENED, OWN_WINDOW_CLOSED]
        .into_iter()
        .filter(|kind| !STUDIO_EVENT_SCHEMA.contains(&format!("\"{kind}\"")))
        .collect();

    for kind in &unread {
        println!("!!  the studio's PageEventSchema does not read the event kind {kind}");
    }

    if !unread.is_empty() {
        std::process::exit(1);
    }

    println!("OK  every own-window event kind Rust sends is one the studio reads");
}
