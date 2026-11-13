use serde_json::{json, Value};

pub const CLAUDE_STREAM: &str = "claude-stream";
pub const FILES_BY_PATH: &str = "path";

pub struct Provider {
    pub id: &'static str,
    pub label: &'static str,
    pub command: &'static str,
    pub output_format: &'static str,
    pub reads_images: bool,
    pub files: &'static str,
    pub resumes_without_an_id: bool,
    pub compacts: bool,
}

// TODO: the provider list comes from the runner plugins; this one entry stays until runners report their facts
pub const PROVIDERS: [Provider; 1] = [Provider {
    id: "claude-code",
    label: "Claude Code",
    command: "claude",
    output_format: CLAUDE_STREAM,
    reads_images: true,
    files: FILES_BY_PATH,
    resumes_without_an_id: false,
    compacts: true,
}];

impl Provider {
    pub fn facts(&self, found: bool) -> Value {
        json!({
            "id": self.id,
            "label": self.label,
            "found": found,
            "outputFormat": self.output_format,
            "resumesWithoutAnId": self.resumes_without_an_id,
            "compacts": self.compacts,
            "reads": { "images": self.reads_images, "files": self.files },
        })
    }
}
