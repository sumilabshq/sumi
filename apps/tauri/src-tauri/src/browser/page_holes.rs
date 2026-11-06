use std::fmt;

pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl Clone for Rect {
    fn clone(&self) -> Self {
        Rect { ..*self }
    }
}

impl Copy for Rect {}

impl PartialEq for Rect {
    fn eq(&self, other: &Self) -> bool {
        self.x == other.x && self.y == other.y && self.width == other.width && self.height == other.height
    }
}

impl fmt::Debug for Rect {
    fn fmt(&self, out: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(out, "({}, {}, {}×{})", self.x, self.y, self.width, self.height)
    }
}

impl Rect {
    fn right(&self) -> f64 {
        self.x + self.width
    }

    fn bottom(&self) -> f64 {
        self.y + self.height
    }

    pub fn contains(&self, x: f64, y: f64) -> bool {
        x >= self.x && x < self.right() && y >= self.y && y < self.bottom()
    }
}

pub fn is_in_hole(holes: &[Rect], x: f64, y: f64) -> bool {
    holes.iter().any(|hole| hole.contains(x, y))
}
