use serde_json::{json, Value};
use std::fmt;
use std::io;

pub enum Refusal {
    BadRoot { detail: String },
    BadPath { detail: String },
    Symlink { detail: String },
    Reserved { detail: String },
    NoWorkspace { detail: String },
    NoFolder { detail: String },
    FolderNotFound { detail: String },
    StaleRev { current_rev: u64 },
    NewerVersion { on_disk_v: u64 },
    BadDoc { detail: String },
    BadLine { detail: String },
    BadCall { detail: String },
    Io { detail: String },
}

impl Refusal {
    pub fn code(&self) -> &'static str {
        match self {
            Self::BadRoot { .. } => "bad-root",
            Self::BadPath { .. } => "bad-path",
            Self::Symlink { .. } => "symlink",
            Self::Reserved { .. } => "reserved",
            Self::NoWorkspace { .. } => "no-workspace",
            Self::NoFolder { .. } => "no-folder",
            Self::FolderNotFound { .. } => "folder-not-found",
            Self::StaleRev { .. } => "stale-rev",
            Self::NewerVersion { .. } => "newer-version",
            Self::BadDoc { .. } => "bad-doc",
            Self::BadLine { .. } => "bad-line",
            Self::BadCall { .. } => "bad-call",
            Self::Io { .. } => "io",
        }
    }

    pub fn to_json(&self) -> Value {
        match self {
            Self::StaleRev { current_rev } => json!({ "code": self.code(), "currentRev": current_rev }),
            Self::NewerVersion { on_disk_v } => json!({ "code": self.code(), "onDiskV": on_disk_v }),
            Self::BadRoot { detail }
            | Self::BadPath { detail }
            | Self::Symlink { detail }
            | Self::Reserved { detail }
            | Self::NoWorkspace { detail }
            | Self::NoFolder { detail }
            | Self::FolderNotFound { detail }
            | Self::BadDoc { detail }
            | Self::BadLine { detail }
            | Self::BadCall { detail }
            | Self::Io { detail } => json!({ "code": self.code(), "detail": detail }),
        }
    }
}

impl From<io::Error> for Refusal {
    fn from(failure: io::Error) -> Self {
        Self::Io {
            detail: failure.to_string(),
        }
    }
}

impl PartialEq for Refusal {
    fn eq(&self, other: &Self) -> bool {
        self.to_json() == other.to_json()
    }
}

impl fmt::Debug for Refusal {
    fn fmt(&self, out: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(out, "{}", self.to_json())
    }
}

impl fmt::Display for Refusal {
    fn fmt(&self, out: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(out, "{}", self.to_json())
    }
}
