fn main() {
    tauri::Builder::default()
        .plugin(widgetarium_host_tauri_lib::assistant::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(widgetarium_host_tauri_lib::store::init())
        .plugin(widgetarium_host_tauri_lib::browser::init())
        .plugin(widgetarium_host_tauri_lib::background_hover::init())
        .plugin(widgetarium_host_tauri_lib::pointer_trace::init())
        .run(tauri::generate_context!())
        .expect("the Widgetarium window failed to start");
}
