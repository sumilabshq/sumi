use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;
use std::sync::Mutex;
use std::time::Duration;
use tauri::ipc::Channel;

pub type ToolAnswer = Result<Value, String>;

const NO_STUDIO: &str = "Sumi's window is not open, so the app cannot answer.";
const NO_ANSWER: &str = "Sumi's window did not answer in time.";
const NOT_AN_ANSWER: &str = "A tool answer names its id and either ok with a value or a refusal with a reason.";
const ANSWER_WAIT: Duration = Duration::from_secs(180);
const PERSON_WAIT: Duration = Duration::from_secs(24 * 60 * 60);

pub struct AgentLink {
    pub exe: String,
    pub socket: String,
    pub token: String,
    pub chat: String,
    pub servers: Vec<String>,
}

pub struct AgentHub {
    pub socket: PathBuf,
    pub token: String,
    studio: Mutex<Option<Channel<Value>>>,
    servers: Mutex<Vec<String>>,
    waiting: Mutex<HashMap<u64, mpsc::Sender<ToolAnswer>>>,
    next_id: AtomicU64,
}

impl AgentHub {
    pub fn new(socket: PathBuf) -> Self {
        AgentHub {
            socket,
            token: uuid::Uuid::new_v4().to_string(),
            studio: Mutex::new(None),
            servers: Mutex::new(Vec::new()),
            waiting: Mutex::new(HashMap::new()),
            next_id: AtomicU64::new(1),
        }
    }

    pub fn open_studio(&self, channel: Channel<Value>, servers: Vec<String>) {
        eprintln!("[agent] studio relay → open, MCP servers: {}", servers.join(", "));
        self.studio.lock().expect("the agent hub's studio channel").replace(channel);
        let mut held = self.servers.lock().expect("the agent hub's MCP servers");
        held.clear();
        held.extend(servers);
    }

    // TRADE-OFF: an MCP call may wait a day for the person; the agent's own MCP_TOOL_TIMEOUT ends it sooner
    pub fn ask_studio(&self, mut ask: Value, may_wait_for_person: bool) -> ToolAnswer {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let (answered, answer) = mpsc::channel();
        self.waiting.lock().expect("the agent hub's waiting calls").insert(id, answered);
        ask["id"] = json!(id);
        let said = format!("{} {}", ask["kind"].as_str().unwrap_or_default(), ask["server"].as_str().or(ask["chat"].as_str()).unwrap_or_default());
        let sent = self.send_to_studio(ask);
        let wait = if may_wait_for_person { PERSON_WAIT } else { ANSWER_WAIT };
        let result = sent.and_then(|()| answer.recv_timeout(wait).map_err(|_| NO_ANSWER.to_string())?);
        self.waiting.lock().expect("the agent hub's waiting calls").remove(&id);
        eprintln!("[agent] {said} → {}", if result.is_ok() { "answered" } else { "refused" });
        result
    }

    pub fn answer(&self, id: u64, answer: ToolAnswer) {
        let waiting = self.waiting.lock().expect("the agent hub's waiting calls").remove(&id);
        if let Some(answered) = waiting {
            drop(answered.send(answer));
        }
    }

    pub fn link_for(&self, chat: &str) -> Option<AgentLink> {
        let exe = std::env::current_exe().ok()?;
        Some(AgentLink {
            exe: exe.to_string_lossy().into_owned(),
            socket: self.socket.to_string_lossy().into_owned(),
            token: self.token.clone(),
            chat: chat.to_string(),
            servers: self.servers.lock().expect("the agent hub's MCP servers").clone(),
        })
    }

    fn send_to_studio(&self, event: Value) -> Result<(), String> {
        let studio = self.studio.lock().expect("the agent hub's studio channel");
        let channel = studio.as_ref().ok_or(NO_STUDIO)?;
        channel.send(event).map_err(|failure| failure.to_string())
    }
}

pub fn tool_answer_of(args: &Value) -> Result<(u64, ToolAnswer), String> {
    let id = args.get("id").and_then(Value::as_u64).ok_or(NOT_AN_ANSWER)?;
    if args.get("ok").and_then(Value::as_bool).ok_or(NOT_AN_ANSWER)? {
        let value = args.get("value").cloned().ok_or(NOT_AN_ANSWER)?;
        return Ok((id, Ok(value)));
    }

    let reason = args.get("error").and_then(Value::as_str).filter(|reason| !reason.is_empty()).ok_or(NOT_AN_ANSWER)?;
    Ok((id, Err(reason.to_string())))
}
