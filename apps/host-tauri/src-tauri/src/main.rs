use widgetarium_host_tauri_lib::agent::mcp;

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
        .run(tauri::generate_context!())
        .expect("the Widgetarium window failed to start");
}
