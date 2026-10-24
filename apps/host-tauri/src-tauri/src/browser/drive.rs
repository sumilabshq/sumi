use super::policy;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::AnyThread;
use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSWindow};
use objc2_core_graphics::{CGRectNull, CGWindowImageOption, CGWindowListCreateImage, CGWindowListOption};
use objc2_foundation::{NSDictionary, NSString};
use serde_json::Value;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Wry};

pub const ONLY_IN_DEBUG: &str = "Driving the browser from a script works only in a debug build.";
const SHOTS_FOLDER: &str = "widgetarium-window-shots";
const NO_PICTURE: &str = "The window gave no picture of itself.";

pub fn is_drive_command(command: &str) -> bool {
    ["window_shot", "drive_log", "drive_front"].contains(&command)
}

fn shot_path(name: &str) -> Result<PathBuf, String> {
    policy::label_of(name)?;
    let folder = std::env::temp_dir().join(SHOTS_FOLDER);
    std::fs::create_dir_all(&folder).map_err(|failure| failure.to_string())?;
    Ok(folder.join(format!("{name}.png")))
}

fn window_png(app: &AppHandle<Wry>) -> Result<Vec<u8>, String> {
    let window = app.get_window(super::dispatch::STUDIO_WEBVIEW).ok_or(NO_PICTURE)?;
    let pointer = window.ns_window().map_err(|failure| failure.to_string())? as *const NSWindow;
    let number = unsafe { &*pointer }.windowNumber() as u32;
    // TRADE-OFF: CGWindowListCreateImage is deprecated for ScreenCaptureKit, which needs the screen-recording grant this test drive does not have
    let image = unsafe {
        CGWindowListCreateImage(
            CGRectNull,
            CGWindowListOption::OptionIncludingWindow,
            number,
            CGWindowImageOption::BoundsIgnoreFraming | CGWindowImageOption::BestResolution,
        )
    }
    .ok_or(NO_PICTURE)?;
    let bitmap = NSBitmapImageRep::initWithCGImage(NSBitmapImageRep::alloc(), &image);
    let properties: Retained<NSDictionary<NSString, AnyObject>> = NSDictionary::new();
    let png = unsafe { bitmap.representationUsingType_properties(NSBitmapImageFileType::PNG, &properties) };
    png.map(|bytes| bytes.to_vec()).ok_or_else(|| NO_PICTURE.to_string())
}

pub fn answer(app: &AppHandle<Wry>, command: &str, args: &Value) -> Result<Value, String> {
    if !cfg!(debug_assertions) {
        return Err(ONLY_IN_DEBUG.into());
    }

    let text = |name: &str| args.get(name).and_then(Value::as_str).unwrap_or_default().to_string();

    if command == "drive_front" {
        let window = app.get_window(super::dispatch::STUDIO_WEBVIEW).ok_or(NO_PICTURE)?;
        return window.set_focus().map(|_| Value::Null).map_err(|failure| failure.to_string());
    }

    if command == "drive_log" {
        println!("[browser-drive] {}", text("line"));
        return Ok(Value::Null);
    }

    let path = shot_path(&text("name"))?;
    let (sender, receiver) = std::sync::mpsc::channel();
    let shooter = app.clone();
    app.run_on_main_thread(move || {
        let _ = sender.send(window_png(&shooter));
    })
    .map_err(|failure| failure.to_string())?;
    let png = receiver.recv().map_err(|failure| failure.to_string())??;
    std::fs::write(&path, png).map_err(|failure| failure.to_string())?;
    Ok(Value::String(path.to_string_lossy().into_owned()))
}
