import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openedPage, shotsOf, sidebarPageFile } from "./tabs-sidebar-pages.ts";
import { checksSidebar } from "./tabs-sidebar-checks.ts";

const folder = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-tabs-sidebar"));
mkdirSync(folder, { recursive: true });
const page = await openedPage(await sidebarPageFile(folder), [1440, 1000]);
const boom = await page.ask(`document.getElementById("boom").textContent`);

if (typeof boom === "string" && boom !== "") {
	console.error(boom);
	page.close();
	process.exit(1);
}

const shots = await shotsOf(page, folder, "tabs-sidebar", ["light", "dark"]);
const failed = await checksSidebar(page, folder);
console.log(shots.join("\n"));
page.close();
process.exit(failed > 0 ? 1 : 0);
