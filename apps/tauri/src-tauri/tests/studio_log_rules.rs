use serde_json::{json, Value};
use widgetarium_host_tauri_lib::app_log::levels::level_asked;
use widgetarium_host_tauri_lib::app_log::redaction::{kept_data, redacted};
use widgetarium_host_tauri_lib::app_log::utc::utc_of;
use widgetarium_host_tauri_lib::app_log::{AppLog, LogContext, LogEntry, DEBUG_FILE, ERRORS_FILE, EVERY_LINE_FILE};
use widgetarium_host_tauri_lib::app_log::rotating_file::RotatingFile;
use widgetarium_host_tauri_lib::studio_log::{level_answer, studio_entry};

fn entry_json(window: &str, args: Value) -> Option<Value> {
    studio_entry(window, &args).ok().and_then(|entry| serde_json::to_value(entry).ok())
}

fn lines_in(path: &std::path::Path) -> Vec<Value> {
    std::fs::read_to_string(path)
        .unwrap_or_default()
        .lines()
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect()
}

fn main() {
    let folder = std::env::temp_dir().join(format!("sumi-log-rules-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&folder);

    let entry = |level: log::Level, line: &str| LogEntry {
            level,
            source: "studio".to_owned(),
            module: None,
            context: LogContext {
                window: Some("main".to_owned()),
                workspace: Some("w-1".to_owned()),
                tab: Some("tab-3".to_owned()),
                chat: None,
            },
            line: line.to_owned(),
            data: Some(json!({ "rev": 4, "auth": { "accessToken": "abc", "inputTokens": 12 } })),
    };
    let lines = [(log::Level::Info, "tab tab-3 none → shown"), (log::Level::Error, "save failed"), (log::Level::Debug, "request ok")];
    let app_log = AppLog::in_folder(&folder, "test", log::Level::Info);
    for (level, line) in lines {
        app_log.write(&entry(level, line));
    }
    let every_line = lines_in(&folder.join(EVERY_LINE_FILE));
    let errors = lines_in(&folder.join(ERRORS_FILE));
    let debug_at_info = folder.join(DEBUG_FILE).exists();

    let debug_folder = folder.join("debug");
    let debug_log = AppLog::in_folder(&debug_folder, "test", log::Level::Debug);
    for (level, line) in lines {
        debug_log.write(&entry(level, line));
    }
    let debug_lines = lines_in(&debug_folder.join(DEBUG_FILE));
    let every_line_at_debug = lines_in(&debug_folder.join(EVERY_LINE_FILE));

    let rotating = RotatingFile {
        path: folder.join("rotating.log"),
        most_bytes: 20,
        kept_old_files: 2,
    };
    for line in ["aaaaaaaaaa\n", "bbbbbbbbbb\n", "cccccccccc\n", "dddddddddd\n"] {
        rotating.append(line).expect("append");
    }
    let read = |path: std::path::PathBuf| std::fs::read_to_string(path).unwrap_or_default();

    let racing = std::sync::Arc::new(RotatingFile {
        path: folder.join("racing.log"),
        most_bytes: 2000,
        kept_old_files: 50,
    });
    let writers: Vec<_> = (0..2)
        .map(|writer| {
            let racing = racing.clone();
            std::thread::spawn(move || {
                for index in 0..200 {
                    racing.append(&format!("writer {writer} line {index:03}\n")).expect("racing append");
                }
            })
        })
        .collect();
    for writer in writers {
        writer.join().expect("writer");
    }
    let raced_lines: usize = std::iter::once(racing.path.clone())
        .chain((1..=50).map(|age| racing.old_file(age)))
        .map(|path| read(path).lines().count())
        .sum();

    let timed = AppLog::in_folder(&folder.join("timed"), "test", log::Level::Info);
    let started = std::time::Instant::now();
    for index in 0..1000 {
        timed.write(&entry(log::Level::Info, &format!("timed line {index}")));
    }
    let micros_per_line = started.elapsed().as_micros() / 1000;
    println!("..  one line costs {micros_per_line}µs (sumi.log only)");

    let long = "x".repeat(5000);
    let cases: Vec<(&str, Option<String>, Option<String>)> = vec![
        (
            "a studio line carries its level, window, workspace, tab and data",
            entry_json("main", json!({ "level": "warn", "line": "[ink] refused", "workspace": "w-1", "tab": "t-2", "data": [{ "reason": "no page" }] }))
                .map(|entry| entry.to_string()),
            Some(json!({ "level": "warn", "source": "studio", "window": "main", "workspace": "w-1", "tab": "t-2", "line": "[ink] refused", "data": [{ "reason": "no page" }] }).to_string()),
        ),
        (
            "a line from the core window is marked core",
            entry_json("studio-core", json!({ "level": "info", "line": "x" })).map(|entry| entry["source"].to_string()),
            Some("\"core\"".to_owned()),
        ),
        (
            "an unknown level is refused",
            entry_json("main", json!({ "level": "loud", "line": "chatty" })).map(|entry| entry.to_string()),
            None,
        ),
        (
            "a long line is cut to its ceiling",
            entry_json("main", json!({ "level": "info", "line": long })).and_then(|entry| entry["line"].as_str().map(|line| line.chars().count().to_string())),
            Some("4000".to_owned()),
        ),
        (
            "every level reaches sumi.log with its time, process and context",
            Some(format!("{} {} {} {}", every_line.len(), every_line[0]["process"], every_line[0]["tab"], every_line[0]["data"]["rev"])),
            Some("2 \"test\" \"tab-3\" 4".to_owned()),
        ),
        (
            "only warnings and errors reach errors.log",
            Some(format!("{} {}", errors.len(), errors[0]["line"])),
            Some("1 \"save failed\"".to_owned()),
        ),
        (
            "a full file moves aside and the oldest beyond the kept count is dropped",
            Some(format!("{}|{}|{}|{}", read(rotating.path.clone()), read(rotating.old_file(1)), read(rotating.old_file(2)), rotating.old_file(3).exists())),
            Some("dddddddddd\n|cccccccccc\n|bbbbbbbbbb\n|false".to_owned()),
        ),
        (
            "a debug line is dropped at info and no debug.log is made",
            Some(format!("{} {debug_at_info}", every_line.iter().any(|line| line["level"] == "debug"))),
            Some("false false".to_owned()),
        ),
        (
            "at debug, debug.log holds every level in order while sumi.log keeps info and above",
            Some(format!("{:?} {}", debug_lines.iter().map(|line| line["level"].to_string()).collect::<Vec<_>>(), every_line_at_debug.len())),
            Some(r#"["\"info\"", "\"error\"", "\"debug\""] 2"#.to_owned()),
        ),
        (
            "a secret in data is redacted in the file, token counts are kept",
            Some(every_line[0]["data"]["auth"].to_string()),
            Some(json!({ "accessToken": "[redacted]", "inputTokens": 12 }).to_string()),
        ),
        (
            "redaction reaches into arrays",
            Some(redacted(&json!([{ "password": "x", "name": "n" }])).to_string()),
            Some(json!([{ "name": "n", "password": "[redacted]" }]).to_string()),
        ),
        (
            "a secret in data too big to keep whole is redacted before the cut",
            Some(kept_data(&json!({ "apiKey": "sk-live", "body": "y".repeat(20_000) })).to_string().contains("sk-live").to_string()),
            Some("false".to_owned()),
        ),
        ("two writers rotating one file lose no line", Some(raced_lines.to_string()), Some("400".to_owned())),
        ("a line is written in well under a millisecond", Some((micros_per_line < 500).to_string()), Some("true".to_owned())),
        ("SUMI_LOG=debug asks for debug", Some(format!("{:?}", level_asked(Some("debug")))), Some("(Debug, None)".to_owned())),
        ("no SUMI_LOG keeps info", Some(format!("{:?}", level_asked(None))), Some("(Info, None)".to_owned())),
        ("an unknown SUMI_LOG keeps info and names the word", Some(format!("{:?}", level_asked(Some("loud")))), Some("(Info, Some(\"loud\"))".to_owned())),
        (
            "the studio is told the level and whether debug is kept",
            Some(format!("{} {}", level_answer(log::Level::Info), level_answer(log::Level::Trace))),
            Some(r#"{"keepsDebug":false,"level":"info"} {"keepsDebug":true,"level":"trace"}"#.to_owned()),
        ),
        (
            "a debug line from the studio is accepted",
            entry_json("main", json!({ "level": "debug", "line": "[request] x → ok" })).map(|entry| entry["level"].to_string()),
            Some("\"debug\"".to_owned()),
        ),
        ("time is UTC with milliseconds", Some(utc_of(1_794_931_476, 7)), Some("2026-11-17T16:04:36.007Z".to_owned())),
        ("a leap day is dated right", Some(utc_of(1_709_164_800, 0)), Some("2024-02-29T00:00:00.000Z".to_owned())),
    ];
    let _ = std::fs::remove_dir_all(&folder);
    let mut failed = 0;

    for (what, got, wanted) in cases {
        let ok = got == wanted;

        if !ok {
            failed += 1;
            println!("!!  {what}\n    got    {got:?}\n    wanted {wanted:?}");
            continue;
        }

        println!("OK  {what}");
    }

    if failed > 0 {
        println!("{failed} check(s) failed");
        std::process::exit(1);
    }

    println!("all studio log rules hold");
}
