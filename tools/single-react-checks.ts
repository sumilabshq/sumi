import fs from "node:fs";
import path from "node:path";
import { check, tally } from "./check-helpers.ts";

const REPO = path.resolve(import.meta.dirname, "..");
const SKIPPED = new Set([".git", ".claude", "target", ".cache"]);

const REACT_PACKAGES = new Set(["react", "react-dom"]);

function isReactPackage(folder: string, name: string): boolean {
	if (path.basename(folder) !== "node_modules" || !REACT_PACKAGES.has(name)) {
		return false;
	}

	return fs.existsSync(path.join(folder, name, "package.json"));
}

function reactCopiesUnder(folder: string): string[] {
	const copies: string[] = [];

	for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
		if (!entry.isDirectory() || SKIPPED.has(entry.name)) {
			continue;
		}

		const inner = path.join(folder, entry.name);

		if (isReactPackage(folder, entry.name)) {
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
