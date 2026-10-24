// TRADE-OFF: one module-wide clock; one stage moves at a time, and a picture queue reads it
let movedAt = 0;

export function movedNow(): void {
	movedAt = Date.now();
}

export function msSinceMoved(): number {
	return Date.now() - movedAt;
}
