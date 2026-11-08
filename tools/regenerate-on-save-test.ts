import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { check, tally } from "./check-helpers.ts";
import { GenerateRuns, regenerationsOf } from "../packages/shared/vite/src/regenerate-on-save.ts";
import type { Regeneration } from "../packages/shared/vite/src/regenerate-on-save.ts";

const root = path.resolve(import.meta.dirname, "..");

function foldersRegeneratedAfter(file: string): readonly string[] {
	return regenerationsOf(path.join(root, file)).map(({ folder }) => folder);
}

const started: Regeneration[] = [];
const finishers: (() => void)[] = [];
const runs = new GenerateRuns((regeneration, finished) => {
	started.push(regeneration);
	finishers.push(finished);
});
const layoutSave = {
	root,
	folder: "packages/state/layout",
	file: "packages/state/layout/module.ts",
};
runs.request(layoutSave);
runs.request(layoutSave);
runs.request({
	...layoutSave,
	file: "packages/state/layout/features/panes/requests.ts",
});
const whileFirstRuns = started.length;
finishers.shift()?.();
const afterFirst = started.map(({ file }) => file);
finishers.shift()?.();
check(
	"a package runs one generate at a time and keeps one rerun, for the latest save",
	[whileFirstRuns, afterFirst, finishers.length],
	[1, ["packages/state/layout/module.ts", "packages/state/layout/features/panes/requests.ts"], 0],
);

check(
	"a save in framework sources regenerates nothing",
	foldersRegeneratedAfter("packages/shared/data-framework/src/module.ts"),
	[],
);
check(
	"a saved schema regenerates its module, whose contract copies it",
	foldersRegeneratedAfter("packages/state/layout/shared/schema/frame-sides.schema.ts"),
	["packages/state/layout"],
);
check(
	"a save in a module the Sumi contract lists regenerates the contract package too",
	foldersRegeneratedAfter("apps/tauri/capabilities/terminal/module.ts"),
	["apps/tauri/capabilities/terminal", "packages/shared/contract"],
);

const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "regenerate-on-save-")));
const broken = path.join(scratch, "packages/broken");
fs.mkdirSync(path.join(broken, "generated"), { recursive: true });
fs.mkdirSync(path.join(broken, "features/notes"), { recursive: true });
fs.writeFileSync(path.join(scratch, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
fs.writeFileSync(path.join(broken, "package.json"), "{ not json");
const warned: unknown[] = [];
const warn = console.warn;
console.warn = (...said: unknown[]) => warned.push(...said);
const brokenRegenerations = regenerationsOf(path.join(broken, "features/notes/requests.ts"));
console.warn = warn;
fs.rmSync(scratch, { recursive: true, force: true });
check(
	"a package.json that is not JSON is skipped with its reason logged",
	[brokenRegenerations, warned.length > 0 && String(warned[0]).includes("is not JSON")],
	[[], true],
);

console.log(
	tally.failed ? `regenerate on save: ${tally.failed} check(s) failed` : "regenerate on save: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
