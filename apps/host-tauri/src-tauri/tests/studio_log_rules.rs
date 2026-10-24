use widgetarium_host_tauri_lib::studio_log::studio_line;

fn main() {
    let long = format!("[widgetarium] {}", "x".repeat(5000));
    let cases = [
        (
            "a studio line reaches the log with its level",
            studio_line("info", "[widgetarium] tab drag → own window"),
            Some("[studio] info [widgetarium] tab drag → own window".to_string()),
        ),
        ("a line without the studio mark is never written", studio_line("error", "secret page text"), None),
        ("an unknown level is never written", studio_line("debug", "[widgetarium] chatty"), None),
        (
            "a long line is cut to its ceiling",
            studio_line("warn", &long).map(|line| line.chars().count().to_string()),
            Some((4000 + "[studio] warn ".len()).to_string()),
        ),
    ];
    let mut failed = 0;

    for (what, got, wanted) in cases {
        let ok = got == wanted;

        if !ok {
            failed += 1;
        }

        println!("{}{what}", if ok { "OK  " } else { "!!  " });
    }

    if failed > 0 {
        println!("{failed} check(s) failed");
        std::process::exit(1);
    }

    println!("all studio log rules hold");
}
