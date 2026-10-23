pub mod dispatch;
pub mod drive;
pub mod navigation_proxy;
pub mod pages;
pub mod policy;
pub mod webkit;

use pages::Pages;
use std::sync::Arc;
use tauri::plugin::{Builder, TauriPlugin};
use tauri::Wry;

pub const PLUGIN_NAME: &str = "browser";

pub fn init() -> TauriPlugin<Wry> {
    let pages = Arc::new(Pages::new());
    Builder::new(PLUGIN_NAME).invoke_handler(move |invoke| dispatch::handle(&pages, invoke)).build()
}
