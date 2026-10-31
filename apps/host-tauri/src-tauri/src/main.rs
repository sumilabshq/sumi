use widgetarium_host_tauri_lib::agent::mcp;
use widgetarium_host_tauri_lib::app_installer::{self, scheme};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if mcp::is_asked(&args) {
        mcp::serve(&args);
        return;
    }

    tauri::Builder::default()
        .plugin(widgetarium_host_tauri_lib::assistant::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(widgetarium_host_tauri_lib::store::init())
        .plugin(widgetarium_host_tauri_lib::browser::init())
        .plugin(widgetarium_host_tauri_lib::studio_log::init())
        .plugin(widgetarium_host_tauri_lib::agent::init())
        .plugin(widgetarium_host_tauri_lib::studio_core::init())
        .plugin(widgetarium_host_tauri_lib::terminal::init())
        .plugin(app_installer::init())
        .register_asynchronous_uri_scheme_protocol(scheme::SCHEME, app_installer::serve_scheme)
        .run(tauri::generate_context!())
        .expect("the Widgetarium window failed to start");
}
