use serde_json::{Map, Value};

pub const REDACTED: &str = "[redacted]";

const LONGEST_DATA_CHARS: usize = 16_000;

const SECRET_KEY_PARTS: [&str; 4] = ["secret", "password", "authorization", "cookie"];
const SECRET_KEY_ENDINGS: [&str; 3] = ["token", "apikey", "api_key"];

pub fn redacted(data: &Value) -> Value {
    match data {
        Value::Object(fields) => Value::Object(
            fields
                .iter()
                .map(|(key, value)| (key.clone(), if is_secret_key(key) { Value::String(REDACTED.to_owned()) } else { redacted(value) }))
                .collect::<Map<String, Value>>(),
        ),
        Value::Array(items) => Value::Array(items.iter().map(redacted).collect()),
        _ => data.clone(),
    }
}

fn is_secret_key(key: &str) -> bool {
    let lowered = key.to_lowercase();
    SECRET_KEY_PARTS.iter().any(|part| lowered.contains(part)) || SECRET_KEY_ENDINGS.iter().any(|ending| lowered.ends_with(ending))
}

pub fn kept_data(data: &Value) -> Value {
    let redacted = redacted(data);
    let text = redacted.to_string();

    if text.chars().count() <= LONGEST_DATA_CHARS {
        return redacted;
    }

    Value::String(text.chars().take(LONGEST_DATA_CHARS).collect())
}
