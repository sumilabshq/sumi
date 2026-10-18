import { isRecord } from "./page-dom.ts";
import { DRAGGED, HOVERED } from "./studio-tabs-exact-probe.ts";

export interface Difference {
	readonly at: string;
	readonly board: unknown;
	readonly built: unknown;
}

const SIZE_TOLERANCE_PX = 0.5;
const COLOUR_TOLERANCE = 3;

export const UNJUDGED = [
	"brand: the accent is the host's; the board's is pinned on the built column so everything drawn from it is compared",
	"rows[DRAGGED] at rest: the board draws it lifted, so it is judged in the drag phase",
	"rows[HOVERED] fill and x positions at rest: the board draws it hovered with its grip in the flow; its fill is judged in the hover phase",
	"newTab.y: the board column is 764px tall, the built one fills its window; newTab.fromBottom is judged",
	"hovered.icon: the board's grip pushes the icon right; the person asked for a grip that moves nothing",
];

export function withoutUnjudged(seen: Record<string, unknown>): Record<string, unknown> {
	const rows = Array.isArray(seen["rows"]) ? [...seen["rows"]] : [];
	rows[DRAGGED] = null;
	const hoveredRow: unknown = rows[HOVERED];
	rows[HOVERED] = isRecord(hoveredRow)
		? {
				...hoveredRow,
				fill: null,
				icon: null,
				glyph: null,
				title: null,
				subtitle: null,
			}
		: null;
	return {
		...seen,
		brand: null,
		rows,
		newTab: withField(seen["newTab"], "y"),
		hovered: withField(seen["hovered"], "icon"),
	};
}

export function differences(board: unknown, built: unknown, at: string): Difference[] {
	if (isColour(board) && isColour(built)) {
		return isNear(board, built, COLOUR_TOLERANCE) ? [] : [{ at, board, built }];
	}

	if (typeof board === "number" && typeof built === "number") {
		return Math.abs(board - built) <= SIZE_TOLERANCE_PX ? [] : [{ at, board, built }];
	}

	if (Array.isArray(board) && Array.isArray(built)) {
		const length = Math.max(board.length, built.length);
		return Array.from({ length }, (_, i) => differences(board[i], built[i], `${at}[${i}]`)).flat();
	}

	if (isRecord(board) && isRecord(built)) {
		return Object.keys(board).flatMap((key) => differences(board[key], built[key], `${at}.${key}`));
	}

	return JSON.stringify(board) === JSON.stringify(built) ? [] : [{ at, board, built }];
}

function withField(part: unknown, unjudged: string): Record<string, unknown> | null {
	return isRecord(part)
		? {
				...part,
				[unjudged]: null,
			}
		: null;
}

function isColour(value: unknown): value is readonly number[] {
	return Array.isArray(value) && value.length === 3 && value.every((one) => typeof one === "number");
}

function isNear(board: readonly number[], built: readonly number[], tolerance: number): boolean {
	return board.every((value, i) => Math.abs(value - (built[i] ?? Number.POSITIVE_INFINITY)) <= tolerance);
}
