use widgetarium_host_tauri_lib::browser::tear_off::{is_outside, own_window_spot, Frame, OwnWindowAsk, TornWindow};

struct Checks {
    failed: usize,
}

impl Checks {
    fn check<T: PartialEq + std::fmt::Debug>(&mut self, what: &str, got: T, wanted: T) {
        let ok = got == wanted;

        if !ok {
            self.failed += 1;
        }

        let detail = if ok { String::new() } else { format!("  got {got:?}, want {wanted:?}") };
        println!("{}{what}{detail}", if ok { "OK  " } else { "!!  " });
    }
}

const STUDIO: Frame = Frame { left: -175.0, top: -1410.0, width: 2560.0, height: 1350.0 };
const SCREEN: Frame = Frame { left: 0.0, top: 50.0, width: 3000.0, height: 1900.0 };
const WINDOW: TornWindow = TornWindow { width: 960.0, height: 720.0, grab_top: 40.0 };

fn spot_at(x: f64, y: f64) -> Option<(f64, f64)> {
    own_window_spot(&OwnWindowAsk { studio: &STUDIO, screen: &SCREEN, cursor: (x, y), window: &WINDOW })
}

fn checks_edges(checks: &mut Checks) {
    checks.check("a cursor inside the studio keeps the tab in it", is_outside(&STUDIO, 1000.0, -700.0), false);
    checks.check("a cursor on the studio edge is still inside", is_outside(&STUDIO, -175.0, -60.0), false);
    checks.check("a cursor past the left edge has left the studio", is_outside(&STUDIO, -176.0, -700.0), true);
    checks.check("a cursor below the studio has left it", is_outside(&STUDIO, 1000.0, -59.0), true);
    checks.check("a cursor above the studio has left it", is_outside(&STUDIO, 1000.0, -1411.0), true);
}

fn checks_spots(checks: &mut Checks) {
    checks.check("a release inside the studio opens no window", spot_at(1000.0, -700.0), None);
    checks.check("a release outside centres the window under the cursor at its grab", spot_at(1500.0, 600.0), Some((1020.0, 560.0)));
    checks.check("a release near the screen's left edge keeps the window on the screen", spot_at(100.0, 600.0), Some((0.0, 560.0)));
    checks.check("a release near the bottom right keeps the whole window on the screen", spot_at(2990.0, 1940.0), Some((2040.0, 1230.0)));
    checks.check("a release above the work area keeps the title bar below it", spot_at(1500.0, 60.0), Some((1020.0, 50.0)));
}

fn main() {
    let mut checks = Checks { failed: 0 };
    checks_edges(&mut checks);
    checks_spots(&mut checks);

    if checks.failed > 0 {
        println!("{} check(s) failed", checks.failed);
        std::process::exit(1);
    }

    println!("all tear-off rules hold");
}
