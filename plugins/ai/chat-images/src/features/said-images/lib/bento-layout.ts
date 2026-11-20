export interface PictureSize {
	readonly width: number;
	readonly height: number;
}

export interface BentoTile {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly isSmall: boolean;
}

export interface BentoLayout {
	readonly tiles: readonly BentoTile[];
	readonly height: number;
	readonly shape: string;
}

interface Placed {
	readonly at: number;
	readonly ratio: number;
}

interface Candidate {
	readonly tiles: ReadonlyMap<number, BentoTile>;
	readonly height: number;
	readonly cost: number;
	readonly shape: string;
}

const TARGET_ROW_PART = 0.45;
const SHORTEST_ROW_PART = 0.22;
const TALLEST_ROW_PART = 0.7;
const TALL_TILE_STRETCH = 1.4;
const NARROWEST_STACK_PART = 0.3;
const OUT_OF_BOUNDS_WEIGHT = 4;
const RULED_OUT = 1e9;
const NARROWEST_RATIO = 0.5;
const WIDEST_RATIO = 3;
const NARROW_RATIO = 0.8;
const SMALL_PART = 0.25;
const SMALL_TILE_PX = 96;
const MOST_IN_ROW = 4;

export function bentoOf(pictures: readonly PictureSize[], columnWidth: number, gap: number): BentoLayout {
	const isSmall = (picture: PictureSize): boolean => picture.width < columnWidth * SMALL_PART;
	const placed = pictures.flatMap((picture, at) => (isSmall(picture) ? [] : [{ at, ratio: clampedRatioOf(picture) }]));
	const best = bestCandidateOf(placed, columnWidth, gap);
	const smallAt = pictures.flatMap((picture, at) => (isSmall(picture) ? [at] : []));
	const smallTop = placed.length === 0 ? 0 : best.height + gap;
	const smallTiles = smallTilesOf(smallAt, pictures, smallTop, gap);
	const tiles = pictures.map((_, at) => best.tiles.get(at) ?? smallTiles.get(at) ?? emptyTile());
	const smallHeight = Math.max(0, ...[...smallTiles.values()].map((tile) => tile.height));
	return {
		tiles,
		height: smallAt.length === 0 ? best.height : smallTop + smallHeight,
		shape: smallAt.length === 0 ? best.shape : `${best.shape}, ${String(smallAt.length)} small`,
	};
}

function clampedRatioOf({ width, height }: PictureSize): number {
	return Math.min(WIDEST_RATIO, Math.max(NARROWEST_RATIO, width / height));
}

function bestCandidateOf(placed: readonly Placed[], columnWidth: number, gap: number): Candidate {
	if (placed.length === 0) {
		return { tiles: new Map(), height: 0, cost: 0, shape: "none" };
	}

	const rowCandidates = rowSizesOf(placed.length).map((sizes) => rowsOf(placed, sizes, columnWidth, gap));
	const narrowAt = placed.findIndex(({ ratio }) => ratio < NARROW_RATIO);
	const hasTallTile = placed.length >= 3 && placed.length <= MOST_IN_ROW && narrowAt >= 0;
	const candidates = hasTallTile
		? [...rowCandidates, tallTileOf(placed[narrowAt] as Placed, placed.filter((_, at) => at !== narrowAt), columnWidth, gap)]
		: rowCandidates;
	return candidates.reduce((best, candidate) => (candidate.cost < best.cost ? candidate : best));
}

function rowSizesOf(count: number): readonly (readonly number[])[] {
	if (count === 0) {
		return [[]];
	}

	return Array.from({ length: Math.min(MOST_IN_ROW, count) }, (_, at) => at + 1).flatMap((first) =>
		rowSizesOf(count - first).map((rest) => [first, ...rest]),
	);
}

function rowsOf(placed: readonly Placed[], sizes: readonly number[], columnWidth: number, gap: number): Candidate {
	const tiles = new Map<number, BentoTile>();
	let top = 0;
	let start = 0;
	let cost = 0;

	for (const size of sizes) {
		const row = placed.slice(start, start + size);
		const height = (columnWidth - gap * (size - 1)) / row.reduce((sum, { ratio }) => sum + ratio, 0);
		let left = 0;

		for (const { at, ratio } of row) {
			tiles.set(at, { x: left, y: top, width: height * ratio, height, isSmall: false });
			left += height * ratio + gap;
		}

		cost += rowCostOf(height, columnWidth);
		top += height + gap;
		start += size;
	}

	return { tiles, height: top - gap, cost, shape: `rows ${sizes.join("+")}` };
}

function rowCostOf(height: number, columnWidth: number): number {
	const shortest = columnWidth * SHORTEST_ROW_PART;
	const tallest = columnWidth * TALLEST_ROW_PART;
	const tooShort = Math.max(0, shortest - height);
	const tooTall = Math.max(0, height - tallest);
	return (height - columnWidth * TARGET_ROW_PART) ** 2 + OUT_OF_BOUNDS_WEIGHT * (tooShort ** 2 + tooTall ** 2);
}

function tallTileOf(lead: Placed, rest: readonly Placed[], columnWidth: number, gap: number): Candidate {
	const stackRatio = 1 / rest.reduce((sum, { ratio }) => sum + 1 / ratio, 0);
	const height = (columnWidth - gap + gap * (rest.length - 1) * stackRatio) / (lead.ratio + stackRatio);
	const leadWidth = height * lead.ratio;
	const stackWidth = columnWidth - gap - leadWidth;
	const tiles = new Map<number, BentoTile>([[lead.at, { x: 0, y: 0, width: leadWidth, height, isSmall: false }]]);
	let top = 0;

	for (const { at, ratio } of rest) {
		tiles.set(at, { x: leadWidth + gap, y: top, width: stackWidth, height: stackWidth / ratio, isSmall: false });
		top += stackWidth / ratio + gap;
	}

	const tooTall = Math.max(0, height - columnWidth * TALLEST_ROW_PART * TALL_TILE_STRETCH);
	const isStackTooNarrow = stackWidth < columnWidth * NARROWEST_STACK_PART;
	const cost =
		(height / rest.length - columnWidth * TARGET_ROW_PART) ** 2 + OUT_OF_BOUNDS_WEIGHT * tooTall ** 2 + (isStackTooNarrow ? RULED_OUT : 0);
	return { tiles, height, cost, shape: `tall + ${String(rest.length)} stacked` };
}

function smallTilesOf(
	smallAt: readonly number[],
	pictures: readonly PictureSize[],
	top: number,
	gap: number,
): ReadonlyMap<number, BentoTile> {
	const tiles = new Map<number, BentoTile>();
	let left = 0;

	for (const at of smallAt) {
		const picture = pictures[at] as PictureSize;
		const width = Math.max(SMALL_TILE_PX, picture.width);
		tiles.set(at, { x: left, y: top, width, height: Math.max(SMALL_TILE_PX, picture.height), isSmall: true });
		left += width + gap;
	}

	return tiles;
}

function emptyTile(): BentoTile {
	return { x: 0, y: 0, width: 0, height: 0, isSmall: false };
}
