import fs from "node:fs";
import path from "node:path";
import type { DesignSystemSeed, EnginePackage, ProjectSeed } from "@widgetarium/core/project/index.js";
import { HANDBOOK_PAGES } from "./handbook-copy.js";
import { kitEntriesOf, mergedKitIn } from "./kit-copy.js";
import type { PackageLocations } from "./package-locations.js";
import { filesUnder } from "./template-files.js";

const RENAMED_ON_SEED: ReadonlyMap<string, string> = new Map([["_gitignore", ".gitignore"]]);
const SYSTEM_FILES = { usage: "USAGE.md", design: "DESIGN.md", tokens: "tokens.css" } as const;

export interface SeedSources {
	readonly locations: PackageLocations;
	readonly engine: readonly EnginePackage[];
	readonly systems: Readonly<Record<string, DesignSystemSeed>>;
}

export function projectSeedOf({ locations, engine, systems }: SeedSources): ProjectSeed {
	return {
		templates: templatesIn(locations.templates),
		kit: Object.fromEntries(mergedKitIn(locations.kit)),
		kitEntries: kitEntriesOf(locations.kit),
		handbook: Object.fromEntries(HANDBOOK_PAGES.map((page) => [page, textAt(path.join(locations.handbook, page))])),
		systems,
		engine: [...engine].sort((left, right) => left.name.localeCompare(right.name)),
	};
}

export function systemsIn(folder: string): Record<string, DesignSystemSeed> {
	const slugs = fs
		.readdirSync(folder, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	return Object.fromEntries(slugs.map((slug) => [slug, systemSeedIn(path.join(folder, slug))]));
}

function systemSeedIn(folder: string): DesignSystemSeed {
	return {
		usage: textAt(path.join(folder, SYSTEM_FILES.usage)),
		design: textAt(path.join(folder, SYSTEM_FILES.design)),
		tokens: textAt(path.join(folder, SYSTEM_FILES.tokens)),
	};
}

function templatesIn(folder: string): Record<string, string> {
	return Object.fromEntries(
		filesUnder(folder, () => true).map((relative) => [projectPathOf(relative), textAt(path.join(folder, relative))]),
	);
}

function projectPathOf(relative: string): string {
	const segments = relative.split(path.sep);
	const name = segments.pop() ?? "";
	return [...segments, RENAMED_ON_SEED.get(name) ?? name].join("/");
}

function textAt(at: string): string {
	return fs.readFileSync(at, "utf8");
}
