use super::place::Place;
use super::refusal::Refusal;
use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs::{self, File, OpenOptions};
use std::io::{self, ErrorKind, Read, Seek, SeekFrom, Write};

const ID_FIELD: &str = "id";
const MOST_LINES: usize = 1000;
const CHUNK_BYTES: u64 = 64 * 1024;
const NEWLINE: u8 = b'\n';

pub struct LinesRead {
    pub lines: Vec<Value>,
    pub cursor: u64,
    pub has_earlier: bool,
    pub torn_tail: bool,
}

impl LinesRead {
    fn empty() -> Self {
        Self {
            lines: Vec::new(),
            cursor: 0,
            has_earlier: false,
            torn_tail: false,
        }
    }

    pub fn to_json(&self) -> Value {
        json!({
            "lines": self.lines,
            "cursor": self.cursor,
            "hasEarlier": self.has_earlier,
            "tornTail": self.torn_tail,
        })
    }
}

pub fn append(place: &Place, line: &Value) -> Result<(), Refusal> {
    refuse_without_id(line)?;
    if let Some(folder) = place.file.parent() {
        fs::create_dir_all(folder)?;
    }

    let mut out = OpenOptions::new().create(true).read(true).append(true).open(&place.file)?;
    let mut bytes = Vec::new();
    if ends_torn(&mut out)? {
        bytes.push(NEWLINE);
    }

    bytes.extend_from_slice(line.to_string().as_bytes());
    bytes.push(NEWLINE);
    out.write_all(&bytes)?;
    out.sync_data()?;
    Ok(())
}

pub fn read_before(place: &Place, before: Option<u64>, limit: usize) -> Result<LinesRead, Refusal> {
    let file = match File::open(&place.file) {
        Ok(file) => file,
        Err(failure) if failure.kind() == ErrorKind::NotFound => return Ok(LinesRead::empty()),
        Err(failure) => return Err(failure.into()),
    };
    let mut pieces = PiecesFromEnd::new(file, before)?;
    let mut page = Page::new(limit.min(MOST_LINES));
    let torn_tail = keep_tail(&mut pieces, &mut page, &place.label)?;
    while !page.is_full() {
        let Some(piece) = pieces.next_piece()? else {
            break;
        };
        page.keep(piece, &place.label);
    }

    Ok(page.read(torn_tail))
}

fn refuse_without_id(line: &Value) -> Result<(), Refusal> {
    if id_of(line).is_some_and(|id| !id.is_empty()) {
        return Ok(());
    }

    Err(Refusal::BadLine {
        detail: "a line is a JSON object with a string id".to_owned(),
    })
}

fn ends_torn(file: &mut File) -> io::Result<bool> {
    if file.metadata()?.len() == 0 {
        return Ok(false);
    }

    let mut last = [0_u8];
    file.seek(SeekFrom::End(-1))?;
    file.read_exact(&mut last)?;
    Ok(last[0] != NEWLINE)
}

fn keep_tail(pieces: &mut PiecesFromEnd, page: &mut Page, label: &str) -> io::Result<bool> {
    let Some(tail) = pieces.next_piece()? else {
        return Ok(false);
    };
    if tail.bytes.is_empty() {
        return Ok(false);
    }

    if serde_json::from_slice::<Value>(&tail.bytes).is_err() {
        eprintln!("[ink-store] {label} skipped a torn last line");
        page.cursor = tail.start;
        return Ok(true);
    }

    page.keep(tail, label);
    Ok(false)
}

fn id_of(line: &Value) -> Option<&str> {
    line.get(ID_FIELD).and_then(Value::as_str)
}

struct Piece {
    start: u64,
    bytes: Vec<u8>,
}

struct Page {
    limit: usize,
    newest_first: Vec<Value>,
    seen_ids: HashSet<String>,
    cursor: u64,
}

impl Page {
    fn new(limit: usize) -> Self {
        Self {
            limit,
            newest_first: Vec::new(),
            seen_ids: HashSet::new(),
            cursor: u64::MAX,
        }
    }

    fn is_full(&self) -> bool {
        self.newest_first.len() >= self.limit
    }

    fn keep(&mut self, piece: Piece, label: &str) {
        self.cursor = piece.start;
        if piece.bytes.is_empty() {
            return;
        }

        let Ok(line) = serde_json::from_slice::<Value>(&piece.bytes) else {
            eprintln!("[ink-store] {label} skipped an unreadable line");
            return;
        };
        if let Some(id) = id_of(&line) {
            if !self.seen_ids.insert(id.to_owned()) {
                return;
            }
        }

        self.newest_first.push(line);
    }

    fn read(self, torn_tail: bool) -> LinesRead {
        let cursor = if self.cursor == u64::MAX { 0 } else { self.cursor };
        let mut lines = self.newest_first;
        lines.reverse();
        LinesRead {
            lines,
            cursor,
            has_earlier: cursor > 0,
            torn_tail,
        }
    }
}

struct PiecesFromEnd {
    file: File,
    unread_bytes: u64,
    head: Vec<u8>,
    ready: Vec<Piece>,
    is_drained: bool,
}

impl PiecesFromEnd {
    fn new(file: File, before: Option<u64>) -> io::Result<Self> {
        let size = file.metadata()?.len();
        Ok(Self {
            file,
            unread_bytes: before.map_or(size, |before| before.min(size)),
            head: Vec::new(),
            ready: Vec::new(),
            is_drained: false,
        })
    }

    fn next_piece(&mut self) -> io::Result<Option<Piece>> {
        loop {
            if let Some(piece) = self.ready.pop() {
                return Ok(Some(piece));
            }

            if self.unread_bytes == 0 {
                return Ok(self.last_head());
            }

            self.read_chunk()?;
        }
    }

    fn last_head(&mut self) -> Option<Piece> {
        if self.is_drained {
            return None;
        }

        self.is_drained = true;
        Some(Piece {
            start: 0,
            bytes: std::mem::take(&mut self.head),
        })
    }

    fn read_chunk(&mut self) -> io::Result<()> {
        let size = self.unread_bytes.min(CHUNK_BYTES);
        self.unread_bytes -= size;
        let chunk_start = self.unread_bytes;
        let mut chunk = vec![0_u8; usize::try_from(size).unwrap_or(usize::MAX)];
        self.file.seek(SeekFrom::Start(chunk_start))?;
        self.file.read_exact(&mut chunk)?;
        chunk.extend_from_slice(&self.head);
        self.split_chunk(chunk_start, &chunk);
        Ok(())
    }

    fn split_chunk(&mut self, chunk_start: u64, chunk: &[u8]) {
        let mut parts = chunk.split(|byte| *byte == NEWLINE);
        self.head = parts.next().map(<[u8]>::to_vec).unwrap_or_default();
        let mut start = chunk_start + self.head.len() as u64 + 1;
        for part in parts {
            self.ready.push(Piece {
                start,
                bytes: part.to_vec(),
            });
            start += part.len() as u64 + 1;
        }
    }
}
