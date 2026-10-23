import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { sceneDiff } from "./tabs-sidebar-diff.ts";
import { boardPageFile, openedPage, shotsOf, sidebarPageFile } from "./tabs-sidebar-pages.ts";
import { SCENES } from "./tabs-sidebar-scenes.ts";
import { checksSidebar } from "./tabs-sidebar-checks.ts";

const folder = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-tabs-sidebar"));
mkdirSync(folder, { recursive: true });
const page = await openedPage(await sidebarPageFile(folder));
const boom = await page.ask(`document.getElementById("boom").textContent`);

if (typeof boom === "string" && boom !== "") {
	console.error(boom);
	page.close();
	process.exit(1);
}

const shots = await shotsOf(page, folder, "tabs-sidebar", ["light", "dark"]);
const differences: string[] = [];
const board = await openedPage(boardPageFile(folder, "Lc-13", "light"), [1440, 1000]);

for (const theme of ["light", "dark"] as const) {
	for (const scene of SCENES) {
		differences.push(...(await sceneDiff({ built: page, board }, folder, scene, theme)));
	}
}

board.close();
console.log(`board-vs-build: ${differences.length} differences`);
differences.forEach((line) => console.log(`  ${line}`));
const failed = await checksSidebar(page, folder);
console.log(shots.join("\n"));
page.close();
process.exit(failed > 0 || differences.length > 0 ? 1 : 0);
