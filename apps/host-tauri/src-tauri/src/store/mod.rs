pub mod atomic;
pub mod dispatch;
pub mod docs;
pub mod lines;
pub mod place;
pub mod refusal;
pub mod workspaces;

pub use docs::DocRead;
pub use lines::LinesRead;
pub use place::{Place, RootKind, APP_FOLDER};
pub use refusal::Refusal;
pub use workspaces::opened_working_folder;

use serde_json::{Map, Value};
use std::fs::{self, File, OpenOptions};
use std::os::fd::AsRawFd;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Runtime};

pub const PLUGIN_NAME: &str = "store";

const WORKSPACES_FOLDER: &str = "workspaces";
const FOLDER_SETTINGS_FILE: &str = "settings.json";
const STORE_LOCK_FILE: &str = ".store.lock";

pub type Fields = Map<String, Value>;

pub struct Store {
    home: PathBuf,
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

impl Store {
    pub fn new(home: PathBuf) -> Self {
        Self { home }
    }

    pub fn place(&self, root: &str, relative: &str) -> Result<Place, Refusal> {
        let kind = RootKind::parse(root)?;
        place::place_in(&self.root_folder(&kind, relative)?, &kind.label(), relative)
    }

    pub fn global_place(&self, relative: &str) -> Result<Place, Refusal> {
        place::place_in(&self.global_folder(), &RootKind::Global.label(), relative)
    }

    pub fn workspace_place(&self, id: &str, relative: &str) -> Result<Place, Refusal> {
        let kind = RootKind::Workspace(id.to_owned());
        place::place_in(&self.workspace_folder(id)?, &kind.label(), relative)
    }

    pub fn read_doc(&self, place: &Place) -> Result<DocRead, Refusal> {
        let _held = self.lock()?;
        docs::read(place)
    }

    pub fn replace_doc(&self, place: &Place, doc: Value, base_rev: u64, reason: &str) -> Result<u64, Refusal> {
        let _held = self.lock()?;
        docs::replace(place, doc, base_rev, reason)
    }

    pub fn update_doc(
        &self,
        place: &Place,
        reason: &str,
        next_of: impl FnOnce(Option<&Fields>) -> Result<Fields, Refusal>,
    ) -> Result<Fields, Refusal> {
        let _held = self.lock()?;
        docs::update(place, reason, next_of)
    }

    pub fn append_line(&self, place: &Place, line: &Value) -> Result<(), Refusal> {
        let _held = self.lock()?;
        lines::append(place, line)
    }

    pub fn read_lines(&self, place: &Place, before: Option<u64>, limit: usize) -> Result<LinesRead, Refusal> {
        let _held = self.lock()?;
        lines::read_before(place, before, limit)
    }

    fn global_folder(&self) -> PathBuf {
        self.home.join(APP_FOLDER)
    }

    fn workspace_folder(&self, id: &str) -> Result<PathBuf, Refusal> {
        let all = self.global_folder().join(WORKSPACES_FOLDER);
        place::refuse_symlink(&self.global_folder())?;
        place::refuse_symlink(&all)?;
        Ok(all.join(place::checked_id(id, id)?))
    }

    fn root_folder(&self, kind: &RootKind, relative: &str) -> Result<PathBuf, Refusal> {
        match kind {
            RootKind::Global => {
                refuse_workspaces_through_global(relative)?;
                Ok(self.global_folder())
            }
            RootKind::Workspace(id) => self.existing_workspace_folder(id),
            RootKind::Folder(id) => {
                refuse_beyond_folder_settings(relative)?;
                Ok(workspaces::folder_of(self, id)?.join(APP_FOLDER))
            }
        }
    }

    fn existing_workspace_folder(&self, id: &str) -> Result<PathBuf, Refusal> {
        let folder = self.workspace_folder(id)?;
        if folder.is_dir() {
            return Ok(folder);
        }

        Err(Refusal::NoWorkspace { detail: id.to_owned() })
    }

    fn lock(&self) -> Result<HeldLock, Refusal> {
        let place = self.global_place(STORE_LOCK_FILE)?;
        fs::create_dir_all(self.global_folder())?;
        let file = OpenOptions::new().create(true).truncate(false).write(true).open(&place.file)?;
        let locked = unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX) };
        if locked != 0 {
            return Err(std::io::Error::last_os_error().into());
        }

        Ok(HeldLock { file })
    }
}

fn refuse_workspaces_through_global(relative: &str) -> Result<(), Refusal> {
    if relative.split('/').next() != Some(WORKSPACES_FOLDER) {
        return Ok(());
    }

    Err(Refusal::BadPath {
        detail: format!("{relative} belongs to a workspace root, not the global one"),
    })
}

fn refuse_beyond_folder_settings(relative: &str) -> Result<(), Refusal> {
    if relative == FOLDER_SETTINGS_FILE {
        return Ok(());
    }

    Err(Refusal::BadPath {
        detail: format!("a folder holds only {APP_FOLDER}/{FOLDER_SETTINGS_FILE}, not {relative}"),
    })
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |since| u64::try_from(since.as_millis()).unwrap_or(u64::MAX))
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_NAME)
        .invoke_handler(dispatch::handle)
        .setup(|app, _api| {
            app.manage(Store::new(app.path().home_dir()?));
            Ok(())
        })
        .build()
}
