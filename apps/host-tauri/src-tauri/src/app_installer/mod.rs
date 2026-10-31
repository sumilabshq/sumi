pub mod dispatch;
pub mod install;
pub mod paths;
pub mod release;
pub mod scheme;
pub mod strict_json;
pub mod versions;

use paths::{checked_app_id, checked_version, refuse_built_in, refuse_symlink};
use serde_json::{json, Map, Value};
use std::collections::BTreeSet;
use std::fs::{self, File, OpenOptions};
use std::os::fd::AsRawFd;
use std::path::{Path, PathBuf};
use tauri::http::{Request, Response};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Runtime, UriSchemeContext, UriSchemeResponder};
use versions::{AppVersions, STORE_FILE};

pub const PLUGIN_NAME: &str = "apps";
pub const APPS_FOLDER: &str = "apps";
pub const REGISTRY_FILE: &str = "registry.json";

const LOCK_FILE: &str = ".apps.lock";

pub struct AppInstaller {
    apps: PathBuf,
}

struct HeldLock {
    file: File,
}

impl Drop for HeldLock {
    fn drop(&mut self) {
        unsafe {
            libc::flock(self.file.as_raw_fd(), libc::LOCK_UN);
        }
    }
}

impl AppInstaller {
    pub fn new(apps: PathBuf) -> Self {
        Self { apps }
    }

    pub fn registry(&self) -> Result<Value, String> {
        let file = self.apps.join(REGISTRY_FILE);
        if fs::symlink_metadata(&file).is_err() {
            return Ok(json!({ "apps": [] }));
        }

        release::read_json(&file)
    }

    pub fn installed(&self) -> Result<Value, String> {
        let _held = self.lock()?;
        let rows = versions::read_rows(&self.apps)?;
        let mut ids: BTreeSet<String> = rows.keys().cloned().collect();
        ids.extend(versions::installed_ids(&self.apps));
        let apps: Map<String, Value> = ids
            .iter()
            .map(|id| {
                let row = rows.get(id).cloned().unwrap_or_default();
                (id.clone(), row.to_json(&versions::installed_versions(&self.apps, id)))
            })
            .collect();
        Ok(json!({ "apps": apps }))
    }

    pub fn install(&self, id: &str, source: &Path, manifest_sha256: &str) -> Result<Value, String> {
        refuse_built_in(id)?;
        let release = release::verify(source, id, manifest_sha256)?;
        let _held = self.lock()?;
        versions::read_rows(&self.apps)?;
        install::install_release(&self.apps, &release)?;
        self.change_row(id, |row| Ok(row.with_first_install(&release.version)))?;
        Ok(json!({ "id": id, "version": release.version }))
    }

    pub fn switch(&self, id: &str, version: &str) -> Result<Value, String> {
        let _held = self.lock()?;
        self.refuse_not_installed(id, version)?;
        self.change_row(id, |row| row.switched_to(version))
    }

    pub fn fail(&self, id: &str, version: &str) -> Result<Value, String> {
        let _held = self.lock()?;
        self.refuse_not_installed(id, version)?;
        self.change_row(id, |row| Ok(row.failing(version)))
    }

    pub fn retry(&self, id: &str, version: &str) -> Result<Value, String> {
        let _held = self.lock()?;
        self.refuse_not_installed(id, version)?;
        self.change_row(id, |row| Ok(row.retried(version)))
    }

    fn change_row(&self, id: &str, next_of: impl FnOnce(&AppVersions) -> Result<AppVersions, String>) -> Result<Value, String> {
        let mut rows = versions::read_rows(&self.apps)?;
        let was = rows.get(id).cloned();
        let next = next_of(&was.clone().unwrap_or_default())?;
        let versions = versions::installed_versions(&self.apps, id);
        let answer = json!({
            "was": was.clone().unwrap_or_default().to_json(&versions),
            "now": next.to_json(&versions),
        });
        let was_json = was.map_or(Value::Null, |row| row.to_json(&[]));
        let next_json = next.to_json(&[]);
        if was_json == next_json {
            return Ok(answer);
        }

        rows.insert(id.to_owned(), next);
        versions::write_rows(&self.apps, &rows)?;
        eprintln!("[apps] {STORE_FILE} {id}: {was_json} → {next_json}");
        Ok(answer)
    }

    fn refuse_not_installed(&self, id: &str, version: &str) -> Result<(), String> {
        checked_app_id(id)?;
        checked_version(version)?;
        if versions::is_installed(&self.apps, id, version) {
            return Ok(());
        }

        Err(format!("{id} {version} is not installed"))
    }

    fn lock(&self) -> Result<HeldLock, String> {
        refuse_symlink(&self.apps)?;
        fs::create_dir_all(&self.apps).map_err(|failure| format!("{} cannot be made: {failure}", self.apps.display()))?;
        let file = OpenOptions::new()
            .create(true)
            .truncate(false)
            .write(true)
            .open(self.apps.join(LOCK_FILE))
            .map_err(|failure| format!("the app installer lock cannot be opened: {failure}"))?;
        let locked = unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX) };
        if locked != 0 {
            return Err(format!("the app installer lock was refused: {}", std::io::Error::last_os_error()));
        }

        Ok(HeldLock { file })
    }
}

pub fn serve_scheme<R: Runtime>(context: UriSchemeContext<'_, R>, request: Request<Vec<u8>>, responder: UriSchemeResponder) {
    let apps = context.app_handle().path().app_data_dir().map(|data| data.join(APPS_FOLDER));
    let uri = request.uri().to_string();
    let webview_label = context.webview_label().to_owned();
    std::thread::spawn(move || {
        let answer = match apps {
            Ok(apps) => scheme::respond(&apps, &webview_label, &uri),
            Err(_) => scheme::not_found(),
        };
        let mut response = Response::builder().status(answer.status);
        for (name, value) in answer.headers {
            response = response.header(name, value);
        }

        responder.respond(response.body(answer.body).unwrap_or_default());
    });
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_NAME)
        .invoke_handler(dispatch::handle)
        .setup(|app, _api| {
            app.manage(AppInstaller::new(app.path().app_data_dir()?.join(APPS_FOLDER)));
            Ok(())
        })
        .build()
}
