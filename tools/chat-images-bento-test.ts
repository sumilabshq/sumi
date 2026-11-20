import { bentoOf } from "../plugins/ai/chat-images/src/features/said-images/lib/bento-layout.ts";
import type { PictureSize } from "../plugins/ai/chat-images/src/features/said-images/lib/bento-layout.ts";

const COLUMN = 640;
const GAP = 8;
let failed = 0;

function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`);
}

const size = (width: number, height: number): PictureSize => ({ width, height });
const shapeOf = (pictures: readonly PictureSize[]): string => bentoOf(pictures, COLUMN, GAP).shape;
const rounded = (value: number): number => Math.round(value * 10) / 10;

check("two wide screenshots stack at full width", shapeOf([size(1600, 900), size(1600, 900)]), "rows 1+1");
check("a wide screenshot and a phone share one row", shapeOf([size(1440, 900), size(1170, 2532)]), "rows 2");
check("one wide leads, two squares share the row below", shapeOf([size(1920, 1080), size(800, 800), size(800, 800)]), "rows 1+2");
check("a tall phone stands beside two stacked wide ones", shapeOf([size(1170, 2532), size(1600, 1000), size(1600, 1000)]), "tall + 2 stacked");
check("seven mixed pictures split into scored rows", shapeOf([size(1600, 900), size(900, 1200), size(1000, 1000), size(1200, 800), size(800, 1200), size(1920, 1080), size(1000, 750)]), "rows 2+3+2");
check("a tiny icon leaves the grid", shapeOf([size(2000, 400), size(1440, 900), size(48, 48)]), "rows 1+1, 1 small");

const row = bentoOf([size(1440, 900), size(1170, 2532)], COLUMN, GAP).tiles;
check("tiles of a row share one height", rounded(row[0]?.height ?? 0) === rounded(row[1]?.height ?? 0), true);
check("a row fills the column exactly", rounded((row[0]?.width ?? 0) + GAP + (row[1]?.width ?? 0)), COLUMN);

const tall = bentoOf([size(1170, 2532), size(1600, 1000), size(1600, 1000)], COLUMN, GAP).tiles;
check("the stacked side ends level with the tall tile", rounded((tall[1]?.height ?? 0) + GAP + (tall[2]?.height ?? 0)), rounded(tall[0]?.height ?? 0));

const icon = bentoOf([size(1440, 900), size(1440, 900), size(48, 48)], COLUMN, GAP).tiles[2];
check("a tiny icon gets a 96px bordered tile, never smaller", [icon?.width, icon?.height, icon?.isSmall], [96, 96, true]);

const banner = bentoOf([size(2000, 400), size(1440, 900)], COLUMN, GAP).tiles[0];
check("a 5:1 banner is cropped to 3:1", rounded((banner?.width ?? 0) / (banner?.height ?? 1)), 3);

const order = bentoOf([size(48, 48), size(1600, 900), size(1600, 900)], COLUMN, GAP).tiles;
check("tiles keep the reply's order of pictures", order.map((tile) => tile.isSmall), [true, false, false]);

if (failed > 0) {
	console.log(`chat images bento: ${String(failed)} failed`);
	process.exit(1);
}

console.log("chat images bento: all checks pass");
