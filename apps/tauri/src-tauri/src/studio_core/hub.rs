use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{mpsc, Mutex};
use std::time::{Duration, Instant};
use tauri::ipc::Channel;

const CORE_WAIT: Duration = Duration::from_secs(15);
const CORE_POLL: Duration = Duration::from_millis(20);
const ANSWER_WAIT: Duration = Duration::from_secs(30);
const NO_CORE: &str = "The core window is not serving yet.";
const NO_ANSWER: &str = "The core window did not answer in time.";
const CORE_RESTARTED: &str = "The core window restarted before it answered; the call may or may not have run.";

struct ServingCore {
    channel: Channel<Value>,
    serving: u64,
}

struct WaitingCall {
    answered: mpsc::Sender<Value>,
    sent_to: Option<u64>,
}

pub struct CoreHub {
    core: Mutex<Option<ServingCore>>,
    waiting: Mutex<HashMap<u64, WaitingCall>>,
    next_id: AtomicU64,
    next_serving: AtomicU64,
}

impl CoreHub {
    pub fn new() -> Self {
        CoreHub {
            core: Mutex::new(None),
            waiting: Mutex::new(HashMap::new()),
            next_id: AtomicU64::new(1),
            next_serving: AtomicU64::new(1),
        }
    }

    pub fn serve(&self, channel: Channel<Value>) {
        let serving = self.next_serving.fetch_add(1, Ordering::Relaxed);
        self.core.lock().expect("the core hub's channel").replace(ServingCore { channel, serving });
        self.refuse_sent_before(serving);
    }

    pub fn ask_core(&self, call: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let (answered, answer) = mpsc::channel();
        self.waiting.lock().expect("the core hub's waiting calls").insert(id, WaitingCall { answered, sent_to: None });
        let result = self.send_when_serving(id, json!({ "id": id, "call": call })).and_then(|()| answer.recv_timeout(ANSWER_WAIT).map_err(|_| NO_ANSWER.to_string()));
        self.waiting.lock().expect("the core hub's waiting calls").remove(&id);
        result
    }

    pub fn answer(&self, id: u64, answer: Value) {
        let waiting = self.waiting.lock().expect("the core hub's waiting calls").remove(&id);
        if let Some(call) = waiting {
            drop(call.answered.send(answer));
        }
    }

    fn refuse_sent_before(&self, serving: u64) {
        let mut waiting = self.waiting.lock().expect("the core hub's waiting calls");
        let orphaned: Vec<u64> = waiting.iter().filter(|(_, call)| call.sent_to.is_some_and(|sent| sent < serving)).map(|(id, _)| *id).collect();
        for id in orphaned {
            if let Some(call) = waiting.remove(&id) {
                drop(call.answered.send(json!({ "ok": false, "code": "unreachable", "reason": CORE_RESTARTED, "ran": true })));
            }
        }
    }

    fn send_when_serving(&self, id: u64, event: Value) -> Result<(), String> {
        let until = Instant::now() + CORE_WAIT;
        loop {
            let mut core = self.core.lock().expect("the core hub's channel");
            if let Some(serving) = core.as_ref() {
                self.mark_sent(id, serving.serving);
                if serving.channel.send(event.clone()).is_ok() {
                    return Ok(());
                }
                core.take();
            }
            drop(core);

            if Instant::now() >= until {
                return Err(NO_CORE.to_string());
            }

            std::thread::sleep(CORE_POLL);
        }
    }

    fn mark_sent(&self, id: u64, serving: u64) {
        if let Some(call) = self.waiting.lock().expect("the core hub's waiting calls").get_mut(&id) {
            call.sent_to = Some(serving);
        }
    }
}

impl Default for CoreHub {
    fn default() -> Self {
        CoreHub::new()
    }
}
