import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CliRefusal } from "./cli-output.js";

export interface PackageLocations {
	readonly templates: string;
	readonly kit: string;
	readonly handbook: string;
	readonly systems: string;
	readonly repo: string | null;
}

const MANIFEST = "package.json";
const PROJECT_TEMPLATE = "templates/project";
const HANDBOOK = { packed: "dist/handbook", inRepo: "docs/ai", what: "handbook" };
const SYSTEMS = { packed: "dist/design-systems", inRepo: "design-systems", what: "design systems" };
const REPO_MARK = "tools/pack-engine.mts";
const KIT_THEME = "@widgetarium/kit/theme.css";

export function packageLocations(): PackageLocations {
	const packageRoot = ancestorHolding(path.dirname(fileURLToPath(import.meta.url)), MANIFEST);
	if (packageRoot === null) throw new Error("the widgetarium CLI runs outside any package");
	const repo = ancestorHolding(packageRoot, REPO_MARK);
	return {
		templates: path.join(packageRoot, PROJECT_TEMPLATE),
		kit: path.dirname(fileURLToPath(import.meta.resolve(KIT_THEME))),
		handbook: shippedFolderIn(packageRoot, repo, HANDBOOK),
		systems: shippedFolderIn(packageRoot, repo, SYSTEMS),
		repo,
	};
}

export function ancestorHolding(start: string, marker: string): string | null {
	if (fs.existsSync(path.join(start, marker))) return start;
	const parent = path.dirname(start);
	return parent === start ? null : ancestorHolding(parent, marker);
}

interface ShippedFolder {
	readonly packed: string;
	readonly inRepo: string;
	readonly what: string;
}

function shippedFolderIn(packageRoot: string, repo: string | null, { packed, inRepo, what }: ShippedFolder): string {
	const candidates = [path.join(packageRoot, packed), ...(repo === null ? [] : [path.join(repo, inRepo)])];
	const found = candidates.find((candidate) => fs.existsSync(candidate));
	if (found === undefined) throw new CliRefusal(`no ${what} beside the CLI: looked in ${candidates.join(", ")}`);
	return found;
}
