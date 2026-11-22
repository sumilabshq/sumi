import { cloverCapsulesAt, cloverInkAt, leanedPoint } from "./clover-shape.js";
import type { SumiState } from "./sumi-state.js";

export const CLOVER_LOOKS = ["grid", "letters", "confetti", "channels"] as const;

export type CloverLook = (typeof CLOVER_LOOKS)[number];

export interface CloverInks {
	readonly ink: string;
	readonly danger: string;
	readonly warning: string;
	readonly accent: string;
	readonly quiet: string;
}

export interface CloverFrame {
	readonly size: number;
	readonly seconds: number;
	readonly state: SumiState;
	readonly look: CloverLook;
	readonly tilt: number;
	readonly inks: CloverInks;
}

interface Spot {
	readonly x: number;
	readonly y: number;
	readonly column: number;
	readonly row: number;
	readonly cell: number;
	readonly ink: number;
}

type InkAt = (x: number, y: number) => number;

const CELL_PX = 5.2;
const FEWEST_CELLS = 14;
const MOST_CELLS = 46;
const DRAWN_OF_SIZE = 0.94;
const SQUARE_OF_CELL = 0.9;
const LETTER_OF_CELL = 1.3;
const LIGHT_TURN = 0.6;
const HALO = 0.3;
const HALO_FADE = 0.1;
const ASLEEP_SHARE = 0.16;
const SMALLEST_PX = 0.35;
const LETTERS = ".:=+*#@";
const SOLID_FROM_INK = 0.6;
const EDGE_UNTIL_INK = 0.8;
const SCATTER_REACH = 0.22;
const CHANNEL_SHIFT = 0.13;
const CHANNEL_ALPHA = 0.7;

const MOVE_OF: Readonly<Record<SumiState, (spot: Spot, frame: CloverFrame) => number>> = {
	rest: () => 1,
	surprised: () => 1,
	done: () => 1,
	listening: (spot, frame) => 0.65 + 0.35 * Math.sin(frame.seconds * 7 + spot.row * 0.7),
	working: (spot, frame) => 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(turnOf(spot, frame) - frame.seconds * 4)) ** 2,
	waits: (_spot, frame) => 0.8 + 0.2 * Math.sin(frame.seconds * 3),
	error: (spot, frame) => 0.88 + 0.12 * Math.sin(frame.seconds * 9 + spot.column * 7 + spot.row * 13),
	asleep: (spot) => ASLEEP_SHARE / spot.ink,
};

const PAINT_OF: Readonly<
	Record<CloverLook, (context: CanvasRenderingContext2D, spot: Spot, frame: CloverFrame) => void>
> = {
	grid: paintSquare,
	letters: paintLetter,
	confetti: paintConfetti,
	channels: paintSquare,
};

export function paintClover(context: CanvasRenderingContext2D, frame: CloverFrame): void {
	context.clearRect(0, 0, frame.size, frame.size);

	if (frame.look === "channels") {
		paintLayer(context, shifted(frame, -1, frame.inks.danger));
		paintLayer(context, shifted(frame, 1, frame.inks.accent));
	}

	paintLayer(context, {
		frame,
		shift: 0,
		alpha: 1,
	});
}

interface Layer {
	readonly frame: CloverFrame;
	readonly shift: number;
	readonly alpha: number;
}

function shifted(frame: CloverFrame, side: number, ink: string): Layer {
	return {
		frame: {
			...frame,
			inks: {
				...frame.inks,
				ink,
			},
		},
		shift: side * CHANNEL_SHIFT,
		alpha: CHANNEL_ALPHA,
	};
}

function paintLayer(context: CanvasRenderingContext2D, layer: Layer): void {
	const { frame } = layer;
	const across = Math.max(FEWEST_CELLS, Math.min(MOST_CELLS, Math.round(frame.size / CELL_PX)));
	const cell = frame.size / across;
	const inkAt = inkAtOf(frame);
	context.globalAlpha = layer.alpha;
	context.font = `${cell * LETTER_OF_CELL}px monospace`;
	context.textAlign = "center";
	context.textBaseline = "middle";

	for (let row = 0; row < across; row += 1) {
		for (let column = 0; column < across; column += 1) {
			const x = cell * (column + 0.5);
			const y = cell * (row + 0.5);
			PAINT_OF[frame.look](
				context,
				{
					x: x + layer.shift * cell,
					y,
					column,
					row,
					cell,
					ink: inkAt(x + layer.shift * cell * 4, y),
				},
				frame,
			);
		}
	}
}

function inkAtOf(frame: CloverFrame): InkAt {
	const half = frame.size / 2;
	const capsules = cloverCapsulesAt(frame.seconds);
	const light = {
		x: Math.cos(frame.seconds * LIGHT_TURN),
		y: Math.sin(frame.seconds * LIGHT_TURN),
	};
	return (x, y) =>
		cloverInkAt(
			capsules,
			leanedPoint(
				{
					x: (x - half) / (half * DRAWN_OF_SIZE),
					y: (y - half) / (half * DRAWN_OF_SIZE),
				},
				frame.tilt,
			),
			light,
		);
}

function shareOf(spot: Spot, frame: CloverFrame): number {
	if (spot.ink > 0) {
		return Math.min(1, spot.ink * MOVE_OF[frame.state](spot, frame));
	}

	return frame.state === "asleep" ? 0 : HALO * Math.exp(spot.ink / HALO_FADE);
}

function turnOf(spot: Spot, frame: CloverFrame): number {
	return Math.atan2(spot.y - frame.size * 0.45, spot.x - frame.size / 2);
}

function paintSquare(context: CanvasRenderingContext2D, spot: Spot, frame: CloverFrame): void {
	fillSquare(context, spot, spot.cell * SQUARE_OF_CELL * shareOf(spot, frame), frame.inks.ink);
}

function paintLetter(context: CanvasRenderingContext2D, spot: Spot, frame: CloverFrame): void {
	if (spot.ink <= 0) {
		return;
	}

	const letter = LETTERS[Math.min(LETTERS.length - 1, Math.floor(shareOf(spot, frame) * LETTERS.length))] ?? "";
	context.fillStyle = frame.inks.ink;
	context.fillText(letter, spot.x, spot.y);
}

function paintConfetti(context: CanvasRenderingContext2D, spot: Spot, frame: CloverFrame): void {
	const chance = chanceOf(spot.column, spot.row);

	if (spot.ink > 0) {
		const side = spot.ink > SOLID_FROM_INK ? spot.cell * 1.03 : spot.cell * (0.45 + 0.5 * spot.ink);
		const isBright = spot.ink < EDGE_UNTIL_INK && chance < 0.45;
		fillSquare(context, spot, side, isBright ? brightOf(chance / 0.45, frame.inks) : frame.inks.ink);
		return;
	}

	const near = Math.max(0, 1 + spot.ink / SCATTER_REACH);

	if (chance < 0.6 * near) {
		fillSquare(
			context,
			spot,
			spot.cell * 0.42 * near,
			chance < 0.2 ? brightOf(chance / 0.2, frame.inks) : frame.inks.quiet,
		);
	}
}

function brightOf(share: number, inks: CloverInks): string {
	return [inks.danger, inks.warning, inks.accent][Math.floor(share * 3)] ?? inks.accent;
}

function fillSquare(context: CanvasRenderingContext2D, spot: Spot, side: number, ink: string): void {
	if (side < SMALLEST_PX) {
		return;
	}

	context.fillStyle = ink;
	context.fillRect(spot.x - side / 2, spot.y - side / 2, side, side);
}

function chanceOf(column: number, row: number): number {
	const mixed = Math.sin(column * 127.1 + row * 311.7) * 43758.5;
	return mixed - Math.floor(mixed);
}
