pub mod attachments;
pub mod commands;
pub mod dispatch;
pub mod drops;
pub mod paths;
pub mod providers;
pub mod search_path;
pub mod state;
pub mod turns;

use attachments::ensure_private_folder;
use state::Assistant;
use std::path::Path;
use std::sync::Arc;
use std::thread;
use tauri::plugin::{Builder, TauriPlugin};
use tauri::Runtime;

pub const PLUGIN_NAME: &str = "assistant";
pub const ATTACHMENTS_GLOBAL: &str = "__WIDGETARIUM_ATTACHMENTS__";

pub fn attachments_script(folder: &Path) -> String {
    let named = serde_json::to_string(&folder.to_string_lossy()).unwrap_or_else(|_| "null".into());
    format!("Object.defineProperty(window, \"{ATTACHMENTS_GLOBAL}\", {{ value: {named} }});")
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    let assistant = Arc::new(Assistant::with_private_attachments());
    let held = assistant.clone();
    let leaving = assistant.clone();
    Builder::new(PLUGIN_NAME)
        .js_init_script(attachments_script(&assistant.attachments))
        .invoke_handler(move |invoke| dispatch::handle(&held, invoke))
        .setup(move |_app, _api| {
            ensure_private_folder(&assistant.attachments)?;
            thread::spawn(search_path::search_path);
            Ok(())
        })
        .on_drop(move |_app| leaving.turns.stop_all())
        .build()
}
