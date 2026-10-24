pub const PAGE_LABEL_PREFIX: &str = "browser-page-";

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
