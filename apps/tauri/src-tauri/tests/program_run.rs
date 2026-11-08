use std::path::PathBuf;
use widgetarium_host_tauri_lib::program_run::{run, RunInput};

fn input(folder: &str, program: &str, line: &str) -> RunInput {
    RunInput {
        folder: PathBuf::from(folder),
        program: program.to_owned(),
        args: line.split(' ').filter(|word| !word.is_empty()).map(str::to_owned).collect(),
    }
}

#[test]
fn a_program_answers_its_code_and_output() {
    let answer = run(&input("/", "echo", "one two")).expect("echo runs");
    assert_eq!(answer.code, 0);
    assert_eq!(answer.out, "one two\n");
}

#[test]
fn a_failing_program_answers_its_code() {
    let answer = run(&input("/", "git", "rev-parse --show-toplevel")).expect("git runs");
    assert_ne!(answer.code, 0);
    assert!(!answer.err.is_empty());
}

#[test]
fn a_missing_or_relative_folder_is_refused() {
    assert!(run(&input("/no/such/folder", "echo", "")).is_err());
    assert!(run(&input("relative", "echo", "")).is_err());
}

#[test]
fn an_empty_program_is_refused() {
    assert!(run(&input("/", "", "")).is_err());
}
