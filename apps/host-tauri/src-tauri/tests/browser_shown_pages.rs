use std::collections::{HashMap, HashSet};
use widgetarium_host_tauri_lib::browser::pages::{covered_on_arrival, parked_pages, uncovered_pages};

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

    let arrived = |was: &[&str], now: &[&str], held: &[&str]| -> HashSet<String> {
        covered_on_arrival(&pages(was), &pages(now), &covered(held)).into_iter().collect()
    };
    checks.check("a tab shown under an overlay arrives parked", arrived(&["a"], &["b"], &["a"]), &["b"]);
    checks.check("a tab shown with nothing over the page arrives drawn", arrived(&["a"], &["b"], &[]), &[]);
    checks.check("a page already shown keeps its own state", arrived(&["a", "b"], &["a", "b"], &["a"]), &[]);

    let in_main = |ids: &[&str]| -> HashMap<String, Vec<String>> { HashMap::from([("main".to_string(), pages(ids))]) };
    let homes: HashMap<String, String> = HashMap::from([("a".into(), "main".into()), ("b".into(), "main".into())]);
    checks.check("a covered shown page is parked, not hidden", parked_pages(&in_main(&["a", "b"]), &homes, &covered(&["a"])), &["a"]);
    checks.check("a covered page that is not shown is not parked", parked_pages(&in_main(&["b"]), &homes, &covered(&["a"])), &[]);

    if checks.failed > 0 {
        println!("{} check(s) failed", checks.failed);
        std::process::exit(1);
    }

    println!("all shown-page rules hold");
}
