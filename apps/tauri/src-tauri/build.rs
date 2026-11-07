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
    "write_file",
    "read_file",
    "remove_file",
    "take_entry",
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
    "appearance",
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
    "cut",
    "wear_frame",
    "open_own_window",
    "open_own_window_at_cursor",
    "lay_tear_off_ghost",
    "wear_tear_off_ghost",
    "show_tear_off_ghost",
    "focus_own_window",
    "open_studio_window",
    "open_chat_window",
    "focus_window",
    "own_windows",
    "standing_pages",
    "snapshot",
    "page_shot",
    "evaluate",
    "evaluate_frames",
    "site_icon",
    "site_page_head",
    "window_shot",
    "drive_log",
    "drive_front",
];

const STUDIO_LOG_COMMANDS: &[&str] = &["line"];

const AGENT_COMMANDS: &[&str] = &["open_channel", "answer"];

const TERMINAL_COMMANDS: &[&str] = &["open", "write", "resize", "close"];

const FILES_COMMANDS: &[&str] =
    &[
    "read_file",
    "read_file_bytes",
    "read_folder",
    "file_info",
    "write_file",
    "append_file",
    "make_folder",
    "remove",
    "rename",
    "copy",
    "open_in_system_app",
];

const STUDIO_CORE_COMMANDS: &[&str] = &["serve", "call", "answer", "changed", "live_windows", "quit_listening", "flushed_before_quit"];

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
    let studio_core = InlinedPlugin::new()
        .commands(STUDIO_CORE_COMMANDS)
        .default_permission(DefaultPermissionRule::AllowAllCommands);
    let terminal = InlinedPlugin::new()
        .commands(TERMINAL_COMMANDS)
        .default_permission(DefaultPermissionRule::AllowAllCommands);
    let files = InlinedPlugin::new()
        .commands(FILES_COMMANDS)
        .default_permission(DefaultPermissionRule::AllowAllCommands);
    let plugins = Attributes::new().plugin("assistant", assistant).plugin("store", store).plugin("browser", browser);
    let plugins = plugins.plugin("studio-log", studio_log).plugin("agent", agent).plugin("studio-core", studio_core);
    tauri_build::try_build(plugins.plugin("terminal", terminal).plugin("files", files))
        .expect("the Tauri build step failed")
}
