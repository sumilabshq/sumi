use widgetarium_host_tauri_lib::browser::page_holes::{is_in_hole, Rect};

struct Checks {
    failed: usize,
}

impl Checks {
    fn check<T: PartialEq + std::fmt::Debug>(&mut self, what: &str, got: T, wanted: T) {
        let ok = got == wanted;

        if !ok {
            self.failed += 1;
        }

        let verdict = if ok { "OK  " } else { "!!  " };
        let detail = if ok { String::new() } else { format!("  got {got:?}, want {wanted:?}") };
        println!("{verdict}{what}{detail}");
    }
}

fn rect(x: f64, y: f64, width: f64, height: f64) -> Rect {
    Rect { x, y, width, height }
}

fn main() {
    let mut checks = Checks { failed: 0 };
    checks.check("a point in the sidebar is in a hole", is_in_hole(&[rect(700.0, 0.0, 300.0, 800.0)], 800.0, 10.0), true);
    checks.check("a point on the page is not", is_in_hole(&[rect(700.0, 0.0, 300.0, 800.0)], 100.0, 10.0), false);
    checks.check("the hole's right edge belongs to the page", is_in_hole(&[rect(700.0, 0.0, 300.0, 800.0)], 1000.0, 10.0), false);
    checks.check("no hole owns nothing", is_in_hole(&[], 800.0, 10.0), false);

    if checks.failed > 0 {
        println!("{} check(s) failed", checks.failed);
        std::process::exit(1);
    }

    println!("all page-hole rules hold");
}
