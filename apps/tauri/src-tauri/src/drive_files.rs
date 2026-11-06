use crate::browser::drive::png_of_window;
use objc2_app_kit::NSWindow;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager, Runtime, Window};

const DRIVE_FOLDER: &str = "widgetarium-drive";
const POLL_EVERY: Duration = Duration::from_millis(200);
const SCRIPT_EXTENSION: &str = "js";
const SHOT_EXTENSION: &str = "shot";
const STUDIO_MARK: &str = "[widgetarium] [drive]";

pub fn drive_folder() -> PathBuf {
    std::env::temp_dir().join(DRIVE_FOLDER)
}

pub fn start_in_debug<R: Runtime>(app: &AppHandle<R>) {
    if !cfg!(debug_assertions) {
        return;
    }

    let folder = drive_folder();
    if let Err(failure) = fs::create_dir_all(&folder) {
        eprintln!("[drive] off → off ({} could not be made: {failure})", folder.display());
        return;
    }

    eprintln!("[drive] off → watching {}", folder.display());
    let app = app.clone();
    thread::spawn(move || loop {
        answer_requests(&app, &folder);
        thread::sleep(POLL_EVERY);
    });
}

fn answer_requests<R: Runtime>(app: &AppHandle<R>, folder: &Path) {
    let Ok(entries) = fs::read_dir(folder) else {
        return;
    };
    for entry in entries.flatten() {
        answer_request(app, &entry.path());
    }
}

fn answer_request<R: Runtime>(app: &AppHandle<R>, request: &Path) {
    let Some(extension) = request.extension().and_then(|extension| extension.to_str()) else {
        return;
    };
    let Some(name) = request.file_stem().and_then(|stem| stem.to_str()) else {
        return;
    };
    if extension != SCRIPT_EXTENSION && extension != SHOT_EXTENSION {
        return;
    }

    let taken = fs::read_to_string(request).and_then(|content| fs::remove_file(request).map(|()| content));
    let answered = match taken {
        Err(failure) => Err(failure.to_string()),
        Ok(content) if extension == SCRIPT_EXTENSION => run_script(app, name, &content),
        Ok(content) => take_shot(app, name, content.trim()),
    };
    if let Err(failure) = answered {
        eprintln!("[drive] {name} asked → refused ({failure})");
    }
}

fn run_script<R: Runtime>(app: &AppHandle<R>, name: &str, code: &str) -> Result<(), String> {
    let (id, label) = name.split_once('.').ok_or("a script is named <id>.<webview label>.js")?;
    let webview = app.get_webview(label).ok_or_else(|| format!("no webview is labelled {label}"))?;
    webview.eval(wrapped_script(id, code)).map_err(|failure| failure.to_string())
}

fn wrapped_script(id: &str, code: &str) -> String {
    let mark = serde_json::Value::String(format!("{STUDIO_MARK} {id}"));
    format!(
        "(async () => {{ try {{ const answer = await (async () => {{\n{code}\n}})(); console.info({mark} + \" \" + JSON.stringify(answer)); }} catch (failure) {{ console.info({mark} + \" error \" + String(failure)); }} }})();"
    )
}

fn take_shot<R: Runtime>(app: &AppHandle<R>, id: &str, label: &str) -> Result<(), String> {
    let window = app.get_window(label).ok_or_else(|| format!("no window is labelled {label}"))?;
    let (sender, receiver) = mpsc::channel();
    app.run_on_main_thread(move || {
        let _ = sender.send(window_number_of(&window).and_then(png_of_window));
    })
    .map_err(|failure| failure.to_string())?;
    let png = receiver.recv().map_err(|failure| failure.to_string())??;
    let path = drive_folder().join(format!("{id}.png"));
    fs::write(&path, png).map_err(|failure| failure.to_string())?;
    eprintln!("[drive] {id} shot {}", path.display());
    Ok(())
}

fn window_number_of<R: Runtime>(window: &Window<R>) -> Result<u32, String> {
    let pointer = window.ns_window().map_err(|failure| failure.to_string())? as *const NSWindow;
    u32::try_from(unsafe { &*pointer }.windowNumber()).map_err(|failure| failure.to_string())
}
