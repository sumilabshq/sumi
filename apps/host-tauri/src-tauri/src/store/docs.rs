use super::atomic;
use super::place::Place;
use super::refusal::Refusal;
use super::{now_ms, Fields};
use serde_json::{json, Value};
use std::fs;
use std::io::ErrorKind;
use std::sync::atomic::{AtomicU64, Ordering};

const VERSION_FIELD: &str = "v";
const REV_FIELD: &str = "rev";
const LEAST_VERSION: u64 = 1;

static QUARANTINE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

pub struct DocRead {
    pub doc: Option<Value>,
    pub rev: u64,
    pub quarantined: Option<String>,
}

impl DocRead {
    pub fn to_json(&self) -> Value {
        json!({ "doc": self.doc, "rev": self.rev, "quarantined": self.quarantined })
    }
}

enum OnDisk {
    Missing,
    Doc { fields: Fields, v: u64, rev: u64 },
    Corrupt(&'static str),
}

struct Settled {
    fields: Option<Fields>,
    v: u64,
    rev: u64,
    quarantined: Option<String>,
}

impl Settled {
    fn empty(quarantined: Option<String>) -> Self {
        Self {
            fields: None,
            v: 0,
            rev: 0,
            quarantined,
        }
    }
}

pub fn read(place: &Place) -> Result<DocRead, Refusal> {
    let settled = settle(place)?;
    Ok(DocRead {
        doc: settled.fields.map(Value::Object),
        rev: settled.rev,
        quarantined: settled.quarantined,
    })
}

pub fn replace(place: &Place, doc: Value, base_rev: u64, reason: &str) -> Result<u64, Refusal> {
    let (next, next_v) = versioned_fields(doc)?;
    let current = settle(place)?;
    if current.rev != base_rev {
        return Err(Refusal::StaleRev {
            current_rev: current.rev,
        });
    }

    refuse_older_writer(&current, next_v)?;
    write_next(place, &current, next, reason)?;
    Ok(base_rev + 1)
}

pub fn update(
    place: &Place,
    reason: &str,
    next_of: impl FnOnce(Option<&Fields>) -> Result<Fields, Refusal>,
) -> Result<Fields, Refusal> {
    let current = settle(place)?;
    let (next, next_v) = versioned_fields(Value::Object(next_of(current.fields.as_ref())?))?;
    refuse_older_writer(&current, next_v)?;
    write_next(place, &current, next, reason)
}

fn refuse_older_writer(current: &Settled, next_v: u64) -> Result<(), Refusal> {
    if current.v <= next_v {
        return Ok(());
    }

    Err(Refusal::NewerVersion { on_disk_v: current.v })
}

fn write_next(place: &Place, current: &Settled, mut next: Fields, reason: &str) -> Result<Fields, Refusal> {
    let rev = current.rev + 1;
    next.insert(REV_FIELD.to_owned(), Value::from(rev));
    let mut bytes = serde_json::to_vec_pretty(&next).map_err(|failure| Refusal::BadDoc {
        detail: failure.to_string(),
    })?;
    bytes.push(b'\n');
    if let Some(folder) = place.file.parent() {
        fs::create_dir_all(folder)?;
    }

    atomic::sweep_temps(&place.file)?;
    atomic::write_atomically(&place.file, &bytes)?;
    eprintln!(
        "[ink-store] {} rev {} → {} {:?} ({reason})",
        place.label,
        current.rev,
        rev,
        changed_keys(current.fields.as_ref(), &next)
    );
    Ok(next)
}

fn changed_keys(was: Option<&Fields>, became: &Fields) -> Vec<String> {
    let none = Fields::new();
    let was = was.unwrap_or(&none);
    let mut keys: Vec<String> = was
        .keys()
        .chain(became.keys())
        .filter(|key| key.as_str() != REV_FIELD && was.get(*key) != became.get(*key))
        .cloned()
        .collect();
    keys.sort();
    keys.dedup();
    keys
}

fn settle(place: &Place) -> Result<Settled, Refusal> {
    match on_disk(place)? {
        OnDisk::Missing => Ok(Settled::empty(None)),
        OnDisk::Doc { fields, v, rev } => Ok(Settled {
            fields: Some(fields),
            v,
            rev,
            quarantined: None,
        }),
        OnDisk::Corrupt(why) => Ok(Settled::empty(Some(quarantine(place, why)?))),
    }
}

fn on_disk(place: &Place) -> Result<OnDisk, Refusal> {
    let bytes = match fs::read(&place.file) {
        Ok(bytes) => bytes,
        Err(failure) if failure.kind() == ErrorKind::NotFound => return Ok(OnDisk::Missing),
        Err(failure) => return Err(failure.into()),
    };
    let Ok(Value::Object(fields)) = serde_json::from_slice::<Value>(&bytes) else {
        return Ok(OnDisk::Corrupt("not a JSON object"));
    };
    let Some(v) = number_in(&fields, VERSION_FIELD).filter(|v| *v >= LEAST_VERSION) else {
        return Ok(OnDisk::Corrupt("no whole-number v"));
    };
    let rev = number_in(&fields, REV_FIELD).unwrap_or(0);
    Ok(OnDisk::Doc { fields, v, rev })
}

fn quarantine(place: &Place, why: &str) -> Result<String, Refusal> {
    let name = format!(
        "{}.corrupt-{}-{}",
        place.file.file_name().map(|name| name.to_string_lossy()).unwrap_or_default(),
        now_ms(),
        QUARANTINE_SEQUENCE.fetch_add(1, Ordering::Relaxed)
    );
    fs::rename(&place.file, place.file.with_file_name(&name))?;
    eprintln!("[ink-store] {} corrupt → {name} ({why}), the store starts it empty", place.label);
    Ok(name)
}

fn versioned_fields(doc: Value) -> Result<(Fields, u64), Refusal> {
    let Value::Object(fields) = doc else {
        return Err(Refusal::BadDoc {
            detail: "a doc is a JSON object".to_owned(),
        });
    };
    let v = number_in(&fields, VERSION_FIELD)
        .filter(|v| *v >= LEAST_VERSION)
        .ok_or_else(|| Refusal::BadDoc {
            detail: "a doc carries a whole-number v of at least 1".to_owned(),
        })?;
    Ok((fields, v))
}

fn number_in(fields: &Fields, key: &str) -> Option<u64> {
    fields.get(key).and_then(Value::as_u64)
}
