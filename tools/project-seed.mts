import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { EnginePackage, ProjectSeed } from "../packages/core/src/project/index.js";
import { projectSeedOf, systemsIn } from "../packages/cli/src/project-seed-read.js";
import type { PackageLocations } from "../packages/cli/src/package-locations.js";
import { ENGINE_PACKAGES, REPO } from "./pack-engine.mts";

const CLOSURE_SEEDS: readonly string[] = ["@widgetarium/cli", "@widgetarium/vite"];
const INTERNAL_PACKAGE = /^@widgetarium\/.+$/;

const ManifestSchema = z.object({
	name: z.string(),
	version: z.string(),
	dependencies: z.record(z.string(), z.string()).default({}),
});

type Manifest = z.output<typeof ManifestSchema>;

export const REPO_LOCATIONS: PackageLocations = {
	templates: path.join(REPO, "packages/cli/templates/project"),
	kit: path.join(REPO, "packages/kit"),
	handbook: path.join(REPO, "docs/ai"),
	systems: path.join(REPO, "design-systems"),
	repo: REPO,
};

export function pluginProjectSeed(): ProjectSeed {
	return projectSeedOf({
		locations: REPO_LOCATIONS,
		engine: workspaceEngineClosure(),
		systems: systemsIn(REPO_LOCATIONS.systems),
	});
}

export function workspaceEngineClosure(): EnginePackage[] {
	const byName = new Map(
		ENGINE_PACKAGES.map((folder) => manifestIn(folder)).map((manifest) => [manifest.name, manifest]),
	);
	const held = new Map<string, Manifest>();
	const pending = [...CLOSURE_SEEDS];
	for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
		const manifest = byName.get(name);
		if (manifest === undefined || held.has(name)) continue;
		held.set(name, manifest);
		pending.push(...Object.keys(manifest.dependencies).filter((dependency) => INTERNAL_PACKAGE.test(dependency)));
	}
	return [...held.values()].map(({ name, version }) => ({
		name,
		file: `${name.slice(1).replace("/", "-")}-${version}.tgz`,
	}));
}

function manifestIn(folder: string): Manifest {
	return ManifestSchema.parse(JSON.parse(fs.readFileSync(path.join(REPO, folder, "package.json"), "utf8")));
}

if (process.argv[1] === import.meta.filename) {
	process.stdout.write(JSON.stringify(pluginProjectSeed()));
}
