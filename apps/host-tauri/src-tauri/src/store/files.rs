use super::atomic;
use super::place::Place;
use super::refusal::Refusal;
use std::fs;
use std::io::ErrorKind;

pub const FILE_EXTENSION: &str = ".bin";
pub const MOST_FILE_BYTES: usize = 50 * 1024 * 1024;

pub fn write(place: &Place, bytes: &[u8]) -> Result<(), Refusal> {
    if bytes.len() > MOST_FILE_BYTES {
        return Err(Refusal::BadCall {
            detail: format!("{} holds {} bytes, over the {MOST_FILE_BYTES} a stored file may hold", place.label, bytes.len()),
        });
    }

    if let Some(folder) = place.file.parent() {
        fs::create_dir_all(folder)?;
    }

    atomic::write_atomically(&place.file, bytes)?;
    Ok(())
}

pub fn read(place: &Place) -> Result<Vec<u8>, Refusal> {
    Ok(fs::read(&place.file)?)
}

pub fn remove(place: &Place) -> Result<(), Refusal> {
    match fs::remove_file(&place.file) {
        Err(failure) if failure.kind() == ErrorKind::NotFound => Ok(()),
        done => Ok(done?),
    }
}
