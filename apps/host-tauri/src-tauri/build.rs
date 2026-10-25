use tauri_build::{Attributes, DefaultPermissionRule, InlinedPlugin};

const ASSISTANT_COMMANDS: &[&str] =
    &[
    "providers",
    "start_turn",
    "pick_folder",
    "stop_turn",
    "write_attachment",
    "remove_attachment",
    "sweep_attachments",
    "drop_paths",
    "read_dropped",
];

const STORE_COMMANDS: &[&str] = &[
    "read",
    "replace",
    "append",
    "read_lines",
    "open_first_workspace",
    "create_workspace",
    "attach_workspace_folder",
    "mark_workspace_opened",
    "list_workspaces",
    "rename_workspace",
    "choose_workspace_folder",
];

const BROWSER_COMMANDS: &[&str] = &[
    "open",
    "create",
    "close",
    "navigate",
    "back",
    "forward",
    "reload",
    "facts",
    "place",
    "show",
    "cover",
    "open_own_window",
    "open_own_window_at_cursor",
    "focus_own_window",
    "own_windows",
    "snapshot",
    "evaluate",
    "evaluate_frames",
    "window_shot",
    "drive_log",
    "drive_front",
];

const STUDIO_LOG_COMMANDS: &[&str] = &["line"];

const AGENT_COMMANDS: &[&str] = &["open_channel", "answer"];

fn main() {
    let assistant = InlinedPlugin::new()
        .commands(ASSISTANT_COMMANDS)
        .default_permission(DefaultPermissionRule::AllowAllCommands);
    let store = InlinedPlugin::new()
        .commands(STORE_COMMANDS)
        .default_permission(DefaultPermissionRule::AllowAllCommands);
    let browser = InlinedPlugin::new()
        .commands(BROWSER_COMMANDS)
        .default_permission(DefaultPermissionRule::AllowAllCommands);
    let studio_log = InlinedPlugin::new()
        .commands(STUDIO_LOG_COMMANDS)
        .default_permission(DefaultPermissionRule::AllowAllCommands);
    let agent = InlinedPlugin::new()
        .commands(AGENT_COMMANDS)
        .default_permission(DefaultPermissionRule::AllowAllCommands);
    let plugins = Attributes::new().plugin("assistant", assistant).plugin("store", store).plugin("browser", browser);
    tauri_build::try_build(plugins.plugin("studio-log", studio_log).plugin("agent", agent))
        .expect("the Tauri build step failed")
}
