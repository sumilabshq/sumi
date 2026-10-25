use crate::studio_caller::STUDIO_WINDOW_PREFIX;

pub const PAGE_LABEL_PREFIX: &str = "browser-page-";
pub const FIRST_EXTRA_STUDIO_WINDOW: u32 = 2;

const PAGE_SCHEMES: &[&str] = &["http:", "https:"];
const BLANK_PAGES: &[&str] = &["about:blank", "about:srcdoc"];
const FRAME_ONLY_SCHEMES: &[&str] = &["blob:"];
const URL_ERROR_DOMAIN: &str = "NSURLErrorDomain";
const CANCELLED: i64 = -999;
const CERTIFICATE_FIRST: i64 = -1206;
const CERTIFICATE_LAST: i64 = -1200;
const FNV_OFFSET: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;
const SECOND_SEED: u64 = 0x9e37_79b9_7f4a_7c15;

const WEBKIT_USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const SAFARI_BUILD: &str = "605.1.15";
pub const SAFARI_VERSION_UNREAD: &str = "26.0";

pub const NOT_A_PAGE_ID: &str = "A browser page id is lowercase words and digits joined by hyphens, and \"{id}\" is not one.";
pub const NOT_A_PROFILE: &str = "A browser profile id is lowercase words and digits joined by hyphens, and \"{id}\" is not one.";

fn scheme_of(address: &str) -> Option<String> {
    let colon = address.find(':')?;
    Some(address[..=colon].to_ascii_lowercase())
}

fn is_blank_page(address: &str) -> bool {
    let lowered = address.to_ascii_lowercase();
    BLANK_PAGES.iter().any(|blank| lowered == *blank || lowered.starts_with(&format!("{blank}#")))
}

pub fn is_page_address(address: &str) -> bool {
    if is_blank_page(address) {
        return true;
    }

    scheme_of(address).is_some_and(|scheme| PAGE_SCHEMES.contains(&scheme.as_str()))
}

pub fn may_navigate(address: &str) -> bool {
    if is_page_address(address) {
        return true;
    }

    scheme_of(address).is_some_and(|scheme| FRAME_ONLY_SCHEMES.contains(&scheme.as_str()))
}

pub fn is_superseded(domain: &str, code: i64) -> bool {
    domain == URL_ERROR_DOMAIN && code == CANCELLED
}

pub fn failure_kind(domain: &str, code: i64) -> Option<&'static str> {
    if domain != URL_ERROR_DOMAIN || code == CANCELLED {
        return None;
    }

    if (CERTIFICATE_FIRST..=CERTIFICATE_LAST).contains(&code) {
        return Some("certificate");
    }

    match code {
        -1003 | -1006 | -1302 => Some("not-found"),
        -1009 | -1018 | -1020 => Some("offline"),
        -1004 | -1005 | -1011 => Some("refused"),
        -1001 => Some("timed-out"),
        _ => None,
    }
}

fn is_slug(text: &str) -> bool {
    let has_shape = !text.is_empty() && !text.starts_with('-') && !text.ends_with('-');
    has_shape && text.chars().all(|letter| letter.is_ascii_lowercase() || letter.is_ascii_digit() || letter == '-')
}

pub fn label_of(page_id: &str) -> Result<String, String> {
    if !is_slug(page_id) {
        return Err(NOT_A_PAGE_ID.replace("{id}", page_id));
    }

    Ok(format!("{PAGE_LABEL_PREFIX}{page_id}"))
}

fn fnv(seed: u64, text: &str) -> u64 {
    text.bytes().fold(seed, |hash, byte| (hash ^ byte as u64).wrapping_mul(FNV_PRIME))
}

pub fn data_store_of(profile_id: &str) -> Result<[u8; 16], String> {
    if !is_slug(profile_id) {
        return Err(NOT_A_PROFILE.replace("{id}", profile_id));
    }

    let named = format!("widgetarium-browser-{profile_id}");
    let high = fnv(FNV_OFFSET, &named).to_be_bytes();
    let low = fnv(FNV_OFFSET ^ SECOND_SEED, &named).to_be_bytes();
    let mut identifier = [0u8; 16];
    identifier[..8].copy_from_slice(&high);
    identifier[8..].copy_from_slice(&low);
    identifier[6] = (identifier[6] & 0x0f) | 0x40;
    identifier[8] = (identifier[8] & 0x3f) | 0x80;
    Ok(identifier)
}

fn is_version(text: &str) -> bool {
    !text.is_empty() && text.split('.').all(|part| !part.is_empty() && part.chars().all(|c| c.is_ascii_digit()))
}

pub fn user_agent_of(safari_version: Option<&str>) -> String {
    let version = safari_version.filter(|read| is_version(read)).unwrap_or(SAFARI_VERSION_UNREAD);
    format!("{WEBKIT_USER_AGENT} Version/{version} Safari/{SAFARI_BUILD}")
}

pub fn next_studio_window_label(taken: &[&str]) -> String {
    let label_of_number = |number: u32| format!("{STUDIO_WINDOW_PREFIX}{number}");
    let mut number = FIRST_EXTRA_STUDIO_WINDOW;

    while taken.contains(&label_of_number(number).as_str()) {
        number += 1;
    }

    label_of_number(number)
}

pub fn rgb_of_hex(colour: &str) -> Option<(u8, u8, u8)> {
    let digits = colour.strip_prefix('#').filter(|digits| digits.len() == 6)?;
    let channel = |at: usize| u8::from_str_radix(digits.get(at..at + 2)?, 16).ok();
    Some((channel(0)?, channel(2)?, channel(4)?))
}
