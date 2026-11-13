const OPAQUE = 250;
const CHANNELS = 4;
const FULL_CONTRAST = 96;
const SOLID = 128;
const BUCKET = 32;
const MIN_FILL_SHARE = 0.5;
const MIN_MARK_SHARE = 0.03;

export function hasOpaqueGround(pixels: Uint8ClampedArray, side: number): boolean {
	return cornersOf(side).every((corner) => (pixels[corner + 3] ?? 0) >= OPAQUE);
}

export function groundCutOf(pixels: Uint8ClampedArray, side: number): Uint8ClampedArray {
	const [ground = 0] = cornersOf(side);
	const cut = new Uint8ClampedArray(pixels.length);

	for (let at = 0; at < pixels.length; at += CHANNELS) {
		const far = Math.max(
			Math.abs((pixels[at] ?? 0) - (pixels[ground] ?? 0)),
			Math.abs((pixels[at + 1] ?? 0) - (pixels[ground + 1] ?? 0)),
			Math.abs((pixels[at + 2] ?? 0) - (pixels[ground + 2] ?? 0)),
		);
		cut[at + 3] = Math.min(255, (far * 255) / FULL_CONTRAST);
	}

	return cut;
}

export function fillCutOf(pixels: Uint8ClampedArray): Uint8ClampedArray | null {
	const solid = solidStartsOf(pixels);
	const fill = dominantOf(pixels, solid);
	const marks = solid.filter((at) => distanceOf(pixels, at, fill) > FULL_CONTRAST / 2).length;
	const isMarked =
		solid.length > 0 &&
		countAt(pixels, solid, fill) / solid.length >= MIN_FILL_SHARE &&
		marks / solid.length >= MIN_MARK_SHARE;

	if (!isMarked) {
		return null;
	}

	const cut = new Uint8ClampedArray(pixels.length);

	for (let at = 0; at < pixels.length; at += CHANNELS) {
		const kept = Math.max(0, 1 - distanceOf(pixels, at, fill) / FULL_CONTRAST);
		cut[at + 3] = (pixels[at + 3] ?? 0) * kept;
	}

	return cut;
}

function solidStartsOf(pixels: Uint8ClampedArray): readonly number[] {
	const starts: number[] = [];

	for (let at = 0; at < pixels.length; at += CHANNELS) {
		if ((pixels[at + 3] ?? 0) >= SOLID) {
			starts.push(at);
		}
	}

	return starts;
}

function dominantOf(pixels: Uint8ClampedArray, solid: readonly number[]): number {
	const counts = new Map<number, { readonly at: number; count: number }>();

	for (const at of solid) {
		const key = bucketOf(pixels, at);
		const seen = counts.get(key) ?? { at, count: 0 };
		seen.count += 1;
		counts.set(key, seen);
	}

	return [...counts.values()].reduce((best, next) => (next.count > best.count ? next : best), { at: 0, count: 0 }).at;
}

function countAt(pixels: Uint8ClampedArray, solid: readonly number[], fill: number): number {
	return solid.filter((at) => bucketOf(pixels, at) === bucketOf(pixels, fill)).length;
}

function bucketOf(pixels: Uint8ClampedArray, at: number): number {
	const step = (channel: number): number => Math.floor((pixels[at + channel] ?? 0) / BUCKET);
	return (step(0) * 256 + step(1)) * 256 + step(2);
}

function distanceOf(pixels: Uint8ClampedArray, at: number, fill: number): number {
	return Math.max(
		Math.abs((pixels[at] ?? 0) - (pixels[fill] ?? 0)),
		Math.abs((pixels[at + 1] ?? 0) - (pixels[fill + 1] ?? 0)),
		Math.abs((pixels[at + 2] ?? 0) - (pixels[fill + 2] ?? 0)),
	);
}

function cornersOf(side: number): readonly number[] {
	const last = side - 1;
	return [0, last, last * side, last * side + last].map((pixel) => pixel * CHANNELS);
}
