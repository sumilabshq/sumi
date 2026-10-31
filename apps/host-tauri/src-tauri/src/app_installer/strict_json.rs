use serde_json::{Map, Value};

pub type Fields = Map<String, Value>;

pub fn object_of<'a>(value: &'a Value, what: &str) -> Result<&'a Fields, String> {
    value.as_object().ok_or_else(|| format!("{what} is not an object"))
}

pub fn strict_object_of<'a>(value: &'a Value, allowed: &[&str], what: &str) -> Result<&'a Fields, String> {
    let object = object_of(value, what)?;
    if let Some(unknown) = object.keys().find(|key| !allowed.contains(&key.as_str())) {
        return Err(format!("{what} has an unknown field {unknown}"));
    }

    Ok(object)
}

pub fn text_of<'a>(object: &'a Fields, name: &str, what: &str) -> Result<&'a str, String> {
    object.get(name).and_then(Value::as_str).ok_or_else(|| format!("{what} has no {name}"))
}

pub fn strict_texts_of<'a, const N: usize>(value: &'a Value, names: [&str; N], what: &str) -> Result<[&'a str; N], String> {
    let object = strict_object_of(value, &names, what)?;
    let texts: Vec<&str> = names.iter().map(|name| text_of(object, name, what)).collect::<Result<_, _>>()?;
    texts.try_into().map_err(|_| format!("{what} has a field missing"))
}
