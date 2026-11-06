pub mod dispatch;
pub mod drive;
pub mod navigation_proxy;
pub mod page_holes;
pub mod page_keys;
pub mod page_pointer;
pub mod page_press;
pub mod pages;
pub mod policy;
pub mod site_icon;
pub mod studio_hit;
pub mod tear_off;
pub mod tear_off_ghost;
pub mod webkit;
pub mod window_buttons;

use pages::Pages;
use std::sync::Arc;
use tauri::plugin::{Builder, TauriPlugin};
use tauri::Wry;

pub const PLUGIN_NAME: &str = "browser";

pub fn init() -> TauriPlugin<Wry> {
    let pages = Arc::new(Pages::new());
    let watched = pages.clone();
    Builder::new(PLUGIN_NAME)
        .invoke_handler(move |invoke| dispatch::handle(&pages, invoke))
        .on_event(move |app, event| dispatch::on_run_event(&watched, app, event))
        .build()
}
