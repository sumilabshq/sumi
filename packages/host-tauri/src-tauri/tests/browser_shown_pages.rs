use std::collections::HashSet;
use widgetarium_host_tauri_lib::browser::pages::uncovered_pages;

struct Checks {
    failed: usize,
}

impl Checks {
    fn check(&mut self, what: &str, got: HashSet<String>, wanted: &[&str]) {
        let wanted: HashSet<String> = wanted.iter().map(|page| page.to_string()).collect();
        let ok = got == wanted;

        if !ok {
            self.failed += 1;
        }

        let verdict = if ok { "OK  " } else { "!!  " };
        let detail = if ok { String::new() } else { format!("  got {got:?}, want {wanted:?}") };
        println!("{verdict}{what}{detail}");
    }
}

fn pages(ids: &[&str]) -> Vec<String> {
    ids.iter().map(|id| id.to_string()).collect()
}

fn covered(ids: &[&str]) -> HashSet<String> {
    ids.iter().map(|id| id.to_string()).collect()
}

fn main() {
    let mut checks = Checks { failed: 0 };
    checks.check("two shown pages are both visible", uncovered_pages(&pages(&["a", "b"]), &covered(&[])), &["a", "b"]);
    checks.check("a covered page hides alone", uncovered_pages(&pages(&["a", "b"]), &covered(&["a"])), &["b"]);
    checks.check("a covered page that is not shown changes nothing", uncovered_pages(&pages(&["b"]), &covered(&["a"])), &["b"]);
    checks.check("nothing shown shows nothing", uncovered_pages(&pages(&[]), &covered(&[])), &[]);

    if checks.failed > 0 {
        println!("{} check(s) failed", checks.failed);
        std::process::exit(1);
    }

    println!("all shown-page rules hold");
}
