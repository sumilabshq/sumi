use widgetarium_host_tauri_lib::browser::tear_off::{is_outside, Frame};

fn main() {
    let studio = Frame { left: -175.0, top: -1410.0, width: 2560.0, height: 1350.0 };
    let cases = [
        ("a cursor inside the studio keeps the tab in it", 1000.0, -700.0, false),
        ("a cursor on the studio edge is still inside", -175.0, -60.0, false),
        ("a cursor past the left edge has left the studio", -176.0, -700.0, true),
        ("a cursor below the studio has left it", 1000.0, -59.0, true),
        ("a cursor above the studio has left it", 1000.0, -1411.0, true),
    ];
    let mut failed = 0;

    for (what, x, y, wanted) in cases {
        let got = is_outside(&studio, x, y);

        if got != wanted {
            failed += 1;
        }

        println!("{}{what}", if got == wanted { "OK  " } else { "!!  " });
    }

    if failed > 0 {
        println!("{failed} check(s) failed");
        std::process::exit(1);
    }

    println!("all tear-off edge rules hold");
}
