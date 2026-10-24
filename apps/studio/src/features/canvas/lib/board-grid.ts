import type { StageLook } from "@widgetarium/gpu";

export interface BoardGrid {
	readonly pitchPx: number;
	readonly xPx: number;
	readonly yPx: number;
	readonly dotPx: number;
}

const WORLD_PITCH_PX = 18;
const LEAST_SCREEN_PITCH_PX = 8;
const LEAST_DOT_PX = 1;
const MOST_DOT_PX = 1.5;

export function boardGridOf(look: StageLook): BoardGrid {
	const pitchPx = readablePitchOf(WORLD_PITCH_PX * look.scale);
	return {
		pitchPx,
		xPx: wrappedInto(look.x, pitchPx),
		yPx: wrappedInto(look.y, pitchPx),
		dotPx: Math.min(MOST_DOT_PX, Math.max(LEAST_DOT_PX, look.scale)),
	};
}

function readablePitchOf(pitchPx: number): number {
	if (pitchPx <= 0) {
		return WORLD_PITCH_PX;
	}

	let readable = pitchPx;
	while (readable < LEAST_SCREEN_PITCH_PX) {
		readable *= 2;
	}

	return readable;
}

function wrappedInto(px: number, pitchPx: number): number {
	return ((px % pitchPx) + pitchPx) % pitchPx;
}
