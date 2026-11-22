export interface CloverCell {
	readonly x: number;
	readonly y: number;
	readonly leaf: number;
}

export const HEART_LEAF = 4;

const SMALL_FROM_PX = 18;
const SMALL_ROWS = [".##.##.", "###.###", "###.###", "...#...", "###.###", "###.###", ".##.##."];
const ROWS = [
	".##...##.",
	"####.####",
	"####.####",
	".###.###.",
	"....#....",
	".###.###.",
	"####.####",
	"####.####",
	".##...##.",
];

export function cloverRowsOf(size: number): readonly string[] {
	return size < SMALL_FROM_PX ? SMALL_ROWS : ROWS;
}

export function cloverCellsOf(rows: readonly string[]): readonly CloverCell[] {
	const middle = (rows.length - 1) / 2;
	return rows.flatMap((row, y) =>
		[...row].flatMap((mark, x) =>
			mark === "#"
				? [
						{
							x,
							y,
							leaf: leafOf(x - middle, y - middle),
						},
					]
				: [],
		),
	);
}

function leafOf(across: number, down: number): number {
	if (across === 0 && down === 0) {
		return HEART_LEAF;
	}

	if (down < 0) {
		return across < 0 ? 0 : 1;
	}

	return across < 0 ? 3 : 2;
}
