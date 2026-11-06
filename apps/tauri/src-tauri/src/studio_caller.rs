pub const STUDIO_WEBVIEW: &str = "main";

pub const STUDIO_WINDOW_PREFIX: &str = "studio-";

pub const CORE_WINDOW: &str = "studio-core";

pub const NOT_FROM_STUDIO: &str = "Only the studio may call this; a page in a tab may not.";

pub fn is_studio_label(label: &str) -> bool {
    label == STUDIO_WEBVIEW || label.strip_prefix(STUDIO_WINDOW_PREFIX).is_some_and(|rest| !rest.is_empty())
}

pub fn is_shown_studio_label(label: &str) -> bool {
    is_studio_label(label) && label != CORE_WINDOW
}

pub fn refuse_foreign_caller(label: &str) -> Result<(), String> {
    if is_studio_label(label) {
        return Ok(());
    }

    Err(NOT_FROM_STUDIO.to_owned())
}
