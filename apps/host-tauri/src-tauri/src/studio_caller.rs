pub const STUDIO_WEBVIEW: &str = "main";

pub const NOT_FROM_STUDIO: &str = "Only the studio may call this; a page in a tab may not.";

pub fn refuse_foreign_caller(label: &str) -> Result<(), String> {
    if label == STUDIO_WEBVIEW {
        return Ok(());
    }

    Err(NOT_FROM_STUDIO.to_owned())
}
