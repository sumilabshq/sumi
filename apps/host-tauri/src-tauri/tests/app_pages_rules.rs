use std::fs;
use std::os::unix::fs::symlink;
use std::path::PathBuf;
use std::process::ExitCode;
use widgetarium_host_tauri_lib::app_pages::scheme::{frame_policy, respond};
use widgetarium_host_tauri_lib::app_pages::{registered_builds, RegisteredBuild, REGISTERED_APPS};

const INDEX: &str = "<!doctype html><title>tasks</title>";
const SCRIPT: &str = "console.log('tasks')";

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

fn header<'a>(headers: &'a [(&'static str, String)], name: &str) -> Option<&'a str> {
    headers.iter().find(|(known, _)| *known == name).map(|(_, value)| value.as_str())
}

fn monorepo_with_tasks_build() -> PathBuf {
    let root = std::env::temp_dir().join(format!("wg-app-pages-{}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    let build = root.join("apps/tasks/dist");
    fs::create_dir_all(build.join("assets")).expect("the build folder");
    fs::write(build.join("index.html"), INDEX).expect("the page");
    fs::write(build.join("assets/app.js"), SCRIPT).expect("the script");
    fs::write(root.join("apps/tasks/secret.txt"), "outside the build").expect("a file beside the build");
    symlink(build.join("index.html"), build.join("linked.html")).expect("a symlink");
    root
}

fn tasks_registered() -> Vec<RegisteredBuild> {
    vec![RegisteredBuild {
        id: "tasks".to_owned(),
        build: "apps/tasks/dist".to_owned(),
    }]
}

fn scheme_serves_registered_builds(checks: &mut Checks) {
    let root = monorepo_with_tasks_build();
    let registered = tasks_registered();
    let page = respond(&root, &registered, "main", "sumi-app://tasks/index.html");
    checks.check("the scheme serves a registered app's built file", (page.status, page.body.as_slice()), (200, INDEX.as_bytes()));
    checks.check("a studio window is served", respond(&root, &registered, "studio-2", "sumi-app://tasks/index.html").status, 200);
    for label in ["page-1", "studio-", ""] {
        let in_tab = respond(&root, &registered, label, "sumi-app://tasks/index.html");
        checks.check(&format!("webview {label:?} gets 404 and no file"), (in_tab.status, in_tab.body.as_slice()), (404, b"not found".as_slice()));
    }
    checks.check("html is served as html", header(&page.headers, "Content-Type"), Some("text/html; charset=utf-8"));
    checks.check("any origin may read it", header(&page.headers, "Access-Control-Allow-Origin"), Some("*"));
    let policy = frame_policy("tasks");
    checks.check("the frame policy of the served app rides every file", header(&page.headers, "Content-Security-Policy"), Some(policy.as_str()));
    let script = respond(&root, &registered, "main", "sumi-app://tasks/assets/app.js?v=1");
    checks.check("a nested module is served as javascript", header(&script.headers, "Content-Type"), Some("text/javascript; charset=utf-8"));

    let refused_uris = [
        "sumi-app://tasks/../secret.txt",
        "sumi-app://tasks/%2e%2e/secret.txt",
        "sumi-app://tasks/assets/%2E%2E%2F..%2Fsecret.txt",
        "sumi-app://tasks//etc/passwd",
        "sumi-app://tasks/linked.html",
        "sumi-app://tasks/",
        "sumi-app://notes/index.html",
        "sumi-app://../apps/tasks/dist/index.html",
    ];
    for uri in refused_uris {
        checks.check(&format!("{uri} is 404"), respond(&root, &registered, "main", uri).status, 404);
    }

    let _ = fs::remove_dir_all(&root);
}

fn registry_names_every_app(checks: &mut Checks) {
    let ids: Vec<String> = registered_builds(REGISTERED_APPS).into_iter().map(|app| app.id).collect();
    checks.check("the generated registry names the four apps", ids, vec!["browser-page", "chat", "tasks", "terminal"].into_iter().map(str::to_owned).collect());
    let builds_inside_apps = registered_builds(REGISTERED_APPS).iter().all(|app| app.build == format!("apps/{}/dist", app.id));
    checks.check("every registered build is its own folder's dist", builds_inside_apps, true);
}

fn frame_policy_never_reaches_ipc(checks: &mut Checks) {
    let policy = frame_policy("tasks");
    checks.check("the frame policy is one line", policy.contains('\n'), false);
    let connect = policy
        .split(';')
        .map(str::trim)
        .find_map(|directive| directive.strip_prefix("connect-src "))
        .unwrap_or_default();
    checks.check("the frame policy names connect-src", connect.is_empty(), false);
    let sources: Vec<&str> = connect.split_whitespace().collect();
    let reaches_ipc = sources.iter().any(|source| source.contains("ipc") || *source == "*" || *source == "http:");
    checks.check("connect-src never reaches Tauri IPC", reaches_ipc, false);
    checks.check("default-src is none", policy.starts_with("default-src 'none'"), true);
    let app_sources: Vec<&str> = policy.split([' ', ';']).filter(|source| source.starts_with("sumi-app")).collect();
    checks.check("the policy names sumi-app sources", app_sources.is_empty(), false);
    let only_own = app_sources.iter().all(|source| *source == "sumi-app://tasks");
    checks.check("every sumi-app source is the served app alone", only_own, true);
    checks.check("no placeholder is left in a served policy", policy.contains('{'), false);
    checks.check("another app gets its own sources", frame_policy("notes").contains("sumi-app://tasks"), false);
}

fn main() -> ExitCode {
    let mut checks = Checks { failed: 0 };
    scheme_serves_registered_builds(&mut checks);
    registry_names_every_app(&mut checks);
    frame_policy_never_reaches_ipc(&mut checks);
    if checks.failed > 0 {
        println!("{} check(s) failed", checks.failed);
        return ExitCode::FAILURE;
    }

    println!("app pages: all checks passed");
    ExitCode::SUCCESS
}
