use std::collections::{HashMap, HashSet};
use widgetarium_host_tauri_lib::browser::pages::{pages_moving_into, pages_standing_in, visible_pages};
use widgetarium_host_tauri_lib::browser::policy::next_studio_window_label;
use widgetarium_host_tauri_lib::browser::tear_off::{is_outside, own_window_spot, window_spot, Frame, OwnWindowAsk, TornWindow, STUDIO_WINDOW};

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

const LOGICAL_SCREEN: Frame = Frame { left: 0.0, top: 25.0, width: 1728.0, height: 1080.0 };

fn checks_studio_window_spots(checks: &mut Checks) {
    let spot = |x: f64, y: f64| window_spot(&LOGICAL_SCREEN, (x, y), &STUDIO_WINDOW);
    checks.check("a studio window opens with its title strip under the cursor", spot(800.0, 300.0), (250.0, 280.0));
    checks.check("a studio window torn off near the right edge stays whole on the screen", spot(1700.0, 300.0), (628.0, 280.0));
    checks.check("a studio window torn off near the bottom stays whole on the screen", spot(800.0, 1090.0), (250.0, 345.0));
}

fn checks_window_labels(checks: &mut Checks) {
    checks.check("the first extra studio window is studio-2", next_studio_window_label(&["main"]), "studio-2".to_string());
    checks.check(
        "a new studio window takes the lowest free number",
        next_studio_window_label(&["main", "studio-2", "studio-4", "browser-page-tab-1"]),
        "studio-3".to_string(),
    );
}

fn homes(pairs: &[(&str, &str)]) -> HashMap<String, String> {
    pairs.iter().map(|(page, window)| (page.to_string(), window.to_string())).collect()
}

fn names(ids: &[&str]) -> Vec<String> {
    ids.iter().map(|id| id.to_string()).collect()
}

fn sorted(mut pages: Vec<String>) -> Vec<String> {
    pages.sort();
    pages
}

fn visible(shown_in: &[(&str, &[&str])], at_home: &HashMap<String, String>, covered: &[&str]) -> Vec<String> {
    let shown_in = shown_in.iter().map(|(window, pages)| (window.to_string(), names(pages))).collect();
    let covered: HashSet<String> = names(covered).into_iter().collect();
    sorted(visible_pages(&shown_in, at_home, &covered).into_iter().collect())
}

fn checks_pages_in_windows(checks: &mut Checks) {
    let two_windows = homes(&[("tab-1", "main"), ("tab-2", "studio-2"), ("tab-3", "main")]);
    let apart = homes(&[("tab-9", "own-window-browser-page-tab-9")]);
    checks.check(
        "each studio shows its own pages side by side",
        visible(&[("main", &["tab-1"]), ("studio-2", &["tab-2"])], &two_windows, &[]),
        names(&["tab-1", "tab-2"]),
    );
    checks.check(
        "a page that moved away is not shown by the window that held it before",
        visible(&[("main", &["tab-1", "tab-2"]), ("studio-2", &[])], &two_windows, &[]),
        names(&["tab-1"]),
    );
    checks.check(
        "a covered page hides in whichever window holds it",
        visible(&[("main", &["tab-1"]), ("studio-2", &["tab-2"])], &two_windows, &["tab-2"]),
        names(&["tab-1"]),
    );
    checks.check(
        "a page standing in no window is shown nowhere",
        visible(&[("main", &["tab-4"])], &two_windows, &[]),
        names(&[]),
    );
    checks.check(
        "a window showing another window's page takes it, and keeps its own",
        pages_moving_into("studio-2", &names(&["tab-1", "tab-2", "tab-4"]), &two_windows, &HashMap::new()),
        names(&["tab-1", "tab-4"]),
    );
    checks.check(
        "a page in its own window is never pulled into a studio",
        pages_moving_into("main", &names(&["tab-9"]), &homes(&[]), &apart),
        names(&[]),
    );
    checks.check(
        "a closing window gives up exactly the pages standing in it",
        sorted(pages_standing_in("main", &two_windows)),
        names(&["tab-1", "tab-3"]),
    );
}

fn main() {
    let mut checks = Checks { failed: 0 };
    checks_edges(&mut checks);
    checks_spots(&mut checks);
    checks_studio_window_spots(&mut checks);
    checks_window_labels(&mut checks);
    checks_pages_in_windows(&mut checks);

    if checks.failed > 0 {
        println!("{} check(s) failed", checks.failed);
        std::process::exit(1);
    }

    println!("all tear-off and studio window rules hold");
}
