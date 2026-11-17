use std::time::{SystemTime, UNIX_EPOCH};

pub fn utc_now() -> String {
    let since_epoch = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    utc_of(since_epoch.as_secs(), since_epoch.subsec_millis())
}

pub fn utc_of(seconds: u64, millis: u32) -> String {
    let seconds_of_day = seconds % 86_400;
    let (year, month, day) = civil_date_of_day(seconds / 86_400);
    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{millis:03}Z",
        seconds_of_day / 3600,
        seconds_of_day % 3600 / 60,
        seconds_of_day % 60
    )
}

fn civil_date_of_day(days_since_epoch: u64) -> (u64, u64, u64) {
    let days_since_era_start = days_since_epoch + 719_468;
    let era = days_since_era_start / 146_097;
    let day_of_era = days_since_era_start % 146_097;
    let year_of_era = (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_from_march = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_from_march + 2) / 5 + 1;
    let month = if month_from_march < 10 { month_from_march + 3 } else { month_from_march - 9 };
    let year = year_of_era + era * 400 + u64::from(month <= 2);
    (year, month, day)
}
