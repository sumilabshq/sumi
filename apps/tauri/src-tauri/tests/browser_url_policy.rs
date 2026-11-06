use widgetarium_host_tauri_lib::browser::policy::{
    data_store_of, failure_kind, is_page_address, is_superseded, label_of, may_navigate, rgb_of_hex, user_agent_of, NOT_A_PAGE_ID, NOT_A_PROFILE,
};

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

fn page_addresses(checks: &mut Checks) {
    let opened = [
        "https://example.com/",
        "http://localhost:8080/path?q=1",
        "HTTPS://EXAMPLE.COM",
        "about:blank",
        "about:srcdoc",
        "about:blank#top",
    ];

    for address in opened {
        checks.check(&format!("a tab may open {address}"), is_page_address(address), true);
    }

    let refused = [
        "file:///etc/passwd",
        "javascript:alert(1)",
        "data:text/html,<script>1</script>",
        "tauri://localhost/",
        "ipc://localhost/plugin:browser|create",
        "asset://localhost/x",
        "obsidian://open",
        "blob:https://example.com/1",
        "about:config",
        "chrome://settings",
        "mailto:someone@example.com",
        "",
        "example.com",
    ];

    for address in refused {
        checks.check(&format!("a tab refuses {address:?}"), is_page_address(address), false);
    }
}

fn frame_navigations(checks: &mut Checks) {
    checks.check("a frame may load a blob", may_navigate("blob:https://example.com/1"), true);
    checks.check("a frame may load a web page", may_navigate("https://example.com/"), true);
    checks.check("no frame loads a file", may_navigate("file:///Users"), false);
    checks.check("no frame loads data", may_navigate("data:text/html,x"), false);
    checks.check("no frame reaches the app's own scheme", may_navigate("tauri://localhost/"), false);
    checks.check("no frame runs javascript urls", may_navigate("javascript:void(0)"), false);
}

fn failure_kinds(checks: &mut Checks) {
    let url = "NSURLErrorDomain";
    checks.check("an unknown host is not found", failure_kind(url, -1003), Some("not-found"));
    checks.check("no network is offline", failure_kind(url, -1009), Some("offline"));
    checks.check("a closed port is refused", failure_kind(url, -1004), Some("refused"));
    checks.check("a slow host timed out", failure_kind(url, -1001), Some("timed-out"));
    checks.check("an untrusted certificate", failure_kind(url, -1202), Some("certificate"));
    checks.check("an expired certificate", failure_kind(url, -1201), Some("certificate"));
    checks.check("a cancelled load is no failure", failure_kind(url, -999), None);
    checks.check("a WebKit frame interruption is no failure", failure_kind("WebKitErrorDomain", 102), None);
    checks.check("a cancelled load was superseded", is_superseded(url, -999), true);
    checks.check("an interrupted load still stops the spinner", is_superseded("WebKitErrorDomain", 102), false);
}

fn labels_and_profiles(checks: &mut Checks) {
    checks.check("a tab id becomes a page label", label_of("tab-1"), Ok("browser-page-tab-1".to_string()));
    checks.check("a label refuses slashes", label_of("../main"), Err(NOT_A_PAGE_ID.replace("{id}", "../main")));
    checks.check("a label refuses the studio's own name", label_of("main").is_ok(), true);
    checks.check("a profile refuses capitals", data_store_of("Work"), Err(NOT_A_PROFILE.replace("{id}", "Work")));
    checks.check("one profile keeps one store", data_store_of("default"), data_store_of("default"));
    checks.check("two profiles keep two stores", data_store_of("default") != data_store_of("work"), true);
    let version = data_store_of("default").map(|identifier| identifier[6] >> 4);
    checks.check("a store id is a version-4 uuid", version, Ok(4));
}

fn user_agents(checks: &mut Checks) {
    let webkit = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)";
    checks.check("a read Safari version is said", user_agent_of(Some("26.5")), format!("{webkit} Version/26.5 Safari/605.1.15"));
    checks.check("an unread version says the fallback", user_agent_of(None), format!("{webkit} Version/26.0 Safari/605.1.15"));
    checks.check("a version that is not digits says the fallback", user_agent_of(Some("26 beta")), format!("{webkit} Version/26.0 Safari/605.1.15"));
}

fn frame_colours(checks: &mut Checks) {
    checks.check("a hex frame colour is read", rgb_of_hex("#f4f3ee"), Some((0xf4, 0xf3, 0xee)));
    checks.check("a colour without a hash is refused", rgb_of_hex("f4f3ee"), None);
    checks.check("a short hex is refused", rgb_of_hex("#fff"), None);
    checks.check("a colour that is not hex is refused", rgb_of_hex("#zzzzzz"), None);
}

fn main() {
    let mut checks = Checks { failed: 0 };
    page_addresses(&mut checks);
    user_agents(&mut checks);
    frame_navigations(&mut checks);
    failure_kinds(&mut checks);
    labels_and_profiles(&mut checks);
    frame_colours(&mut checks);

    if checks.failed > 0 {
        println!("{} check(s) failed", checks.failed);
        std::process::exit(1);
    }

    println!("all browser url rules hold");
}
