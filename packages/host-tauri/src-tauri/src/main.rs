fn main() {
    tauri::Builder::default()
        .plugin(widgetarium_host_tauri_lib::assistant::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(widgetarium_host_tauri_lib::store::init())
        .plugin(widgetarium_host_tauri_lib::browser::init())
        .run(tauri::generate_context!())
        .expect("the Widgetarium window failed to start");
}
