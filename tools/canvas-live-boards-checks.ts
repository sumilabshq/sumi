import { boardsInView, liveBoardIds, nextToLoad } from "../plugins/canvas/src/features/canvas/lib/live-boards.ts";
import type { BoardBox, FieldView } from "../plugins/canvas/src/features/canvas/lib/live-boards.ts";
import { check, tally } from "./check-helpers.ts";

const BOARD_SIDE = { w: 1440, h: 1000 };
const ORIGIN_PX = 240;

function rowOf(firstId: number, count: number, y: number): BoardBox[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `board-${firstId + index}`,
		x: index * 1500,
		y,
		...BOARD_SIDE,
	}));
}

const BOARDS = [...rowOf(4, 8, 0), ...rowOf(12, 10, 1100), ...rowOf(22, 8, 2200)];

function viewOf(look: FieldView["look"], width = 1400, height = 900): FieldView {
	return { look, width, height, originPx: ORIGIN_PX };
}

function distanceToCentre(board: BoardBox, view: FieldView): number {
	const centreX = (view.originPx + board.x + board.w / 2) * view.look.scale + view.look.x;
	const centreY = (view.originPx + board.y + board.h / 2) * view.look.scale + view.look.y;
	return Math.hypot(centreX - view.width / 2, centreY - view.height / 2);
}

const halfZoom = viewOf({ x: 0, y: 0, scale: 0.5 });
const inHalfZoom = boardsInView(BOARDS, halfZoom);
const nearest = BOARDS.filter(({ id }) => inHalfZoom.includes(id)).sort(
	(a, b) => distanceToCentre(a, halfZoom) - distanceToCentre(b, halfZoom),
)[0];

check(
	"a field at half zoom holds the first boards and none of the far ones",
	[
		inHalfZoom.includes("board-4"),
		inHalfZoom.includes("board-5"),
		inHalfZoom.includes("board-11"),
		inHalfZoom.includes("board-21"),
		inHalfZoom.includes("board-29"),
		inHalfZoom.length <= 12,
	],
	[true, true, false, false, false, true],
);
check("the first board in view is the one nearest the field centre", inHalfZoom[0], nearest?.id);
check("zoomed far out, every board is in view", boardsInView(BOARDS, viewOf({ x: 0, y: 0, scale: 0.05 })).length, 26);
check(
	"a camera far away from every board gives none",
	boardsInView(BOARDS, viewOf({ x: -100000, y: 0, scale: 1 })),
	[],
);
check("a field with no width gives none", boardsInView(BOARDS, viewOf({ x: 0, y: 0, scale: 0.5 }, 0, 900)), []);
check("a field with no height gives none", boardsInView(BOARDS, viewOf({ x: 0, y: 0, scale: 0.5 }, 1400, 0)), []);

const liveOf = (inView: readonly string[], loaded: readonly string[], loadingId: string | null): string[] =>
	[...liveBoardIds(inView, new Set(loaded), loadingId)].sort();
const nextOf = (inView: readonly string[], loaded: readonly string[]): string | null =>
	nextToLoad(inView, new Set(loaded));

check("with no grant and nothing loaded no board is live", liveOf(["a", "b", "c"], [], null), []);
check("the granted board is live", liveOf(["a", "b", "c"], [], "a"), ["a"]);
check("loaded boards stay live beside the granted one", liveOf(["a", "b", "c"], ["a"], "b"), ["a", "b"]);
check("when all have loaded all are live", liveOf(["a", "b", "c"], ["a", "b", "c"], null), ["a", "b", "c"]);
check("a granted board that is not in view is not live", liveOf(["a", "b"], ["a"], "z"), ["a"]);
check("a loaded board that left the view is not live", liveOf([], ["a"], "a"), []);
check("the next board to load is the first in view", nextOf(["a", "b", "c"], []), "a");
check("the next board to load skips a loaded one", nextOf(["a", "b", "c"], ["a"]), "b");
check("a loaded board behind an unloaded one does not move it", nextOf(["a", "b", "c"], ["b"]), "a");
check("with all loaded nothing is next", nextOf(["a", "b", "c"], ["a", "b", "c"]), null);
check("with nothing in view nothing is next", nextOf([], []), null);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("canvas live boards: all checks passed");
