import {
	DEFAULT_DESIGN_SYSTEM,
	ProjectSeedSchema,
	baseNameOf,
	layProject,
	type ProjectSeed,
} from "@widgetarium/core/project/index.js";
import unpackProjectSeed from "widgetarium:project-seed";
import { vaultProjectWriter, type ProjectVault } from "./vault-project-writer.js";

let pendingSeed: Promise<ProjectSeed> | null = null;

export async function layNewApp(vault: ProjectVault, folder: string): Promise<void> {
	const seed = await bundledProjectSeed();
	await layProject(vaultProjectWriter(vault, folder), {
		name: baseNameOf(folder),
		system: DEFAULT_DESIGN_SYSTEM,
		seed,
	});
}

function bundledProjectSeed(): Promise<ProjectSeed> {
	pendingSeed ??= unpackProjectSeed().then((text) => ProjectSeedSchema.parse(JSON.parse(text)));
	return pendingSeed;
}
