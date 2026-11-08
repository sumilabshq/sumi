use serde::{Deserialize, Serialize};
use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};

const MAX_ANSWER_BYTES: u64 = 32 * 1024 * 1024;

const MAX_ARGS: usize = 128;

#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct RunInput {
    pub folder: PathBuf,
    pub program: String,
    pub args: Vec<String>,
}

#[derive(Serialize, Debug, PartialEq, Eq)]
pub struct ProgramOutput {
    pub code: i32,
    pub out: String,
    pub err: String,
}

fn refuse_input(input: &RunInput) -> Result<(), String> {
    if input.program.is_empty() || input.program.contains('\0') || input.args.iter().any(|arg| arg.contains('\0')) {
        return Err("A program run names a program and text arguments.".to_owned());
    }

    if input.args.len() > MAX_ARGS {
        return Err(format!("A program run takes at most {MAX_ARGS} arguments."));
    }

    if !input.folder.is_absolute() || !input.folder.is_dir() {
        return Err(format!("{} is not an absolute folder.", input.folder.display()));
    }

    Ok(())
}

fn capped_text(stream: Option<impl Read>) -> String {
    let mut bytes = Vec::new();

    if let Some(stream) = stream {
        let _ = stream.take(MAX_ANSWER_BYTES).read_to_end(&mut bytes);
    }

    String::from_utf8_lossy(&bytes).into_owned()
}

pub fn run(input: &RunInput) -> Result<ProgramOutput, String> {
    refuse_input(input)?;
    let mut child = Command::new(&input.program)
        .args(&input.args)
        .current_dir(&input.folder)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("{} did not start: {error}", input.program))?;
    let err_stream = child.stderr.take();
    let err_reader = std::thread::spawn(move || capped_text(err_stream));
    let out = capped_text(child.stdout.take());
    let status = child.wait().map_err(|error| error.to_string())?;
    Ok(ProgramOutput {
        code: status.code().unwrap_or(-1),
        out,
        err: err_reader.join().unwrap_or_default(),
    })
}
