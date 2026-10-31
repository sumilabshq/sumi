const BUILD: &str = include_str!("../build.rs");
const BROWSER: &str = include_str!("../src/browser/dispatch.rs");
const STORE: &str = include_str!("../src/store/dispatch.rs");
const ASSISTANT: &str = include_str!("../src/assistant/dispatch.rs");
const APPS: &str = include_str!("../src/app_installer/dispatch.rs");
const FILES: &str = include_str!("../src/files.rs");
const BROWSER_OUTSIDE_THE_MATCH: [&str; 5] = ["open", "snapshot", "window_shot", "drive_log", "drive_front"];

fn answering_body(dispatch: &str) -> &str {
    let Some((_, after)) = dispatch.split_once("fn answer_of") else { return dispatch };
    after.split_once("\n}\n").map_or(after, |(body, _)| body)
}

fn answered_commands(dispatch: &str) -> Vec<&str> {
    let arms = answering_body(dispatch).lines().filter_map(|line| line.trim_start().strip_prefix('"')?.split_once("\" =>"));
    arms.map(|(name, _)| name).collect()
}

fn listed_commands(constant: &str) -> Vec<&'static str> {
    let opening = format!("const {constant}: &[&str] =");
    let Some((_, after)) = BUILD.split_once(&opening) else { return Vec::new() };
    let list = after.split_once("];").map_or("", |(list, _)| list);
    list.split('"').skip(1).step_by(2).collect()
}

fn unlisted<'a>(answered: &[&'a str], listed: &[&str]) -> Vec<&'a str> {
    answered.iter().filter(|name| !listed.contains(name)).copied().collect()
}

fn main() {
    let mut browser = answered_commands(BROWSER);
    browser.extend(BROWSER_OUTSIDE_THE_MATCH);
    let plugins = [
        ("browser", browser, listed_commands("BROWSER_COMMANDS")),
        ("store", answered_commands(STORE), listed_commands("STORE_COMMANDS")),
        ("assistant", answered_commands(ASSISTANT), listed_commands("ASSISTANT_COMMANDS")),
        ("apps", answered_commands(APPS), listed_commands("APPS_COMMANDS")),
        ("files", answered_commands(FILES), listed_commands("FILES_COMMANDS")),
    ];
    let mut failed = 0;

    for (plugin, answered, listed) in plugins {
        let missing = unlisted(&answered, &listed);
        let ok = !answered.is_empty() && missing.is_empty();

        if !ok {
            failed += 1;
        }

        let detail = if ok { String::new() } else { format!(": the ACL refuses {missing:?}") };
        println!("{}every {plugin} command the studio may call is in build.rs{detail}", if ok { "OK  " } else { "!!  " });
    }

    if failed > 0 {
        println!("{failed} check(s) failed");
        std::process::exit(1);
    }

    println!("every plugin command is allowed");
}
