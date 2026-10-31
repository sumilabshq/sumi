use serde::de::DeserializeOwned;
use serde_json::{Error, Value};

pub fn decode_bytes<T: DeserializeOwned>(bytes: &[u8], what: &str) -> Result<T, String> {
    serde_json::from_slice(bytes).map_err(|failure| refusal_of(&failure, what))
}

pub fn decode_value<T: DeserializeOwned>(value: &Value, what: &str) -> Result<T, String> {
    T::deserialize(value).map_err(|failure| refusal_of(&failure, what))
}

// TRADE-OFF: field names read from serde's message text; serde_json exposes no structured field.
fn refusal_of(failure: &Error, what: &str) -> String {
    if failure.is_syntax() || failure.is_eof() {
        return format!("{what} is not JSON: {failure}");
    }

    let message = failure.to_string();
    if let Some(name) = quoted_after(&message, "missing field `") {
        return format!("{what} has no {name}");
    }

    if let Some(name) = quoted_after(&message, "unknown field `") {
        return format!("{what} has an unknown field {name}");
    }

    format!("{what} is malformed: {message}")
}

fn quoted_after<'a>(message: &'a str, prefix: &str) -> Option<&'a str> {
    message.strip_prefix(prefix)?.split('`').next()
}
