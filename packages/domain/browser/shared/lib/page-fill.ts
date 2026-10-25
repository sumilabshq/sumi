export interface PageColours {
	readonly theme: string | null;
	readonly top: string | null;
	readonly page: string | null;
	readonly canvas: string;
}

export function pageFillOf(colours: PageColours, strip: string | null = null): string {
	return colours.theme ?? strip ?? colours.top ?? colours.page ?? colours.canvas;
}

const STRIP_SHADE_STEP = 16;
const OPAQUE = 255;

export function stripColourOf(samples: readonly (readonly number[])[]): string | null {
	const middle = samples[Math.floor(samples.length / 2)];

	if (middle === undefined || !samples.every((sample) => isNearShade(sample, middle))) {
		return null;
	}

	return `rgb(${middle[0]}, ${middle[1]}, ${middle[2]})`;
}

function isNearShade(sample: readonly number[], middle: readonly number[]): boolean {
	return (
		sample[3] === OPAQUE && [0, 1, 2].every((at) => Math.abs((sample[at] ?? 0) - (middle[at] ?? 0)) <= STRIP_SHADE_STEP)
	);
}
