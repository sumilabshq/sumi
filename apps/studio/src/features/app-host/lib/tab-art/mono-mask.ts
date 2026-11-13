const OPAQUE = 250;
const CHANNELS = 4;
const FULL_CONTRAST = 96;

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

function cornersOf(side: number): readonly number[] {
	const last = side - 1;
	return [0, last, last * side, last * side + last].map((pixel) => pixel * CHANNELS);
}
