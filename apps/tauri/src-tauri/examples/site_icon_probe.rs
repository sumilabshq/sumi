use serde_json::json;
use std::process::ExitCode;
use widgetarium_host_tauri_lib::browser::pages::user_agent;
use widgetarium_host_tauri_lib::browser::site_icon::{page_head, site_icon};

const USAGE: &str = "site_icon_probe head|icon <address>";

fn main() -> ExitCode {
    let arguments: Vec<String> = std::env::args().skip(1).collect();
    let (Some(command), Some(address)) = (arguments.first(), arguments.get(1)) else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };
    let answer = match command.as_str() {
        "head" => page_head(address, user_agent()),
        "icon" => site_icon(address, user_agent()),
        _ => Err(USAGE.to_string()),
    };

    match answer {
        Ok(value) => println!("{value}"),
        Err(failure) => println!("{}", json!({ "failure": failure })),
    }

    ExitCode::SUCCESS
}
