import fs from "node:fs";
import path from "node:path";
import { check, tally } from "./check-helpers.ts";

const REPO = path.resolve(import.meta.dirname, "..");
const SKIPPED = new Set([".git", ".claude", "target", ".cache"]);

function reactCopiesUnder(folder: string): string[] {
	const copies: string[] = [];

	for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
		if (!entry.isDirectory() || SKIPPED.has(entry.name)) {
			continue;
		}

		const inner = path.join(folder, entry.name);
		const isReactPackage =
			path.basename(folder) === "node_modules" && (entry.name === "react" || entry.name === "react-dom");

		if (isReactPackage && fs.existsSync(path.join(inner, "package.json"))) {
			copies.push(path.relative(REPO, inner));
			continue;
		}

		copies.push(...reactCopiesUnder(inner));
	}

	return copies;
}

check("the repository holds one react and one react-dom, in the root node_modules", reactCopiesUnder(REPO).sort(), [
	"node_modules/react",
	"node_modules/react-dom",
]);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("single react: all checks passed");
