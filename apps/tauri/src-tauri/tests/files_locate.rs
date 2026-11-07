use std::fs;
use widgetarium_host_tauri_lib::files::{file_info, locate_file};

fn main() {
    let folder = std::env::temp_dir().join(format!("files-locate-{}", std::process::id()));
    fs::create_dir_all(&folder).expect("the test folder is made");
    let notes = folder.join("notes.md");
    let renamed = folder.join("renamed.md");
    let other = folder.join("other.md");
    fs::write(&notes, "# notes").expect("notes is written");
    fs::write(&other, "# other").expect("other is written");
    let identity = file_info(&notes).expect("notes is read").identity.expect("notes has an identity");
    let stays = locate_file(&notes, &identity);
    fs::rename(&notes, &renamed).expect("notes is renamed");
    let moved = locate_file(&notes, &identity);
    fs::remove_file(&renamed).expect("renamed is removed");
    let lost = locate_file(&notes, &identity);
    let cases = [
        ("a file in place is found where it is", stays, Ok(Some(notes.to_string_lossy().into_owned()))),
        ("a renamed file is found under its new name in its folder", moved, Ok(Some(renamed.to_string_lossy().into_owned()))),
        ("a deleted file is found nowhere, and another file is not taken for it", lost, Ok(None)),
    ];
    let mut failed = 0;
    for (what, got, want) in cases {
        if got == want {
            println!("OK  {what}");
        } else {
            failed += 1;
            println!("!!  {what}: got {got:?}, want {want:?}");
        }
    }
    let _ = fs::remove_dir_all(&folder);
    if failed > 0 {
        std::process::exit(1);
    }
}
