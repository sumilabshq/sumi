use super::mcp::{bridge_of, call_sumi, flag_value};
use serde_json::json;

pub const OPEN_FLAG: &str = "--open";
pub const DOM_FLAG: &str = "--dom";
const NOT_A_PROBE: &str = "--dom takes one JSON object: action inspect, wheel, drag or pinch, and a selector.";
const NEW_TAB_FLAG: &str = "--new-tab";
const OPENED: &str = "opened {href}";
const NOT_OPENED: &str = "Sumi did not open {href}: {reason}";

pub fn is_asked(args: &[String]) -> bool {
    args.iter().any(|arg| arg == OPEN_FLAG || arg == DOM_FLAG)
}

fn probe(args: &[String]) -> i32 {
    let Ok(mut asked) = serde_json::from_str::<serde_json::Value>(&flag_value(args, DOM_FLAG)) else {
        eprintln!("{NOT_A_PROBE}");
        return 2;
    };
    asked["kind"] = json!("dom");
    match call_sumi(&bridge_of(args), asked) {
        Ok(answer) => {
            println!("{answer:#}");
            0
        }
        Err(reason) => {
            eprintln!("{reason}");
            1
        }
    }
}

pub fn run(args: &[String]) -> i32 {
    if args.iter().any(|arg| arg == DOM_FLAG) {
        return probe(args);
    }

    let href = flag_value(args, OPEN_FLAG);
    let opens_new = args.iter().any(|arg| arg == NEW_TAB_FLAG);
    match call_sumi(&bridge_of(args), json!({ "kind": "open", "href": href, "opensNew": opens_new })) {
        Ok(_) => {
            println!("{}", OPENED.replace("{href}", &href));
            0
        }
        Err(reason) => {
            eprintln!("{}", NOT_OPENED.replace("{href}", &href).replace("{reason}", &reason));
            1
        }
    }
}
