import { MemoryPluginStateStore, plugin, runtime } from "../packages/shared/plugin-framework/src/index.ts";
import type { Plugin } from "../packages/shared/plugin-framework/src/index.ts";
import type { FilledApp } from "../plugins/apps/src/index.ts";
import { commandMenu } from "../plugins/command-menu/src/index.ts";
import { backend, shell, windows } from "../plugins/sumi-host/src/index.ts";

function ignored(): void {
	return undefined;
}

export function appsFilledBy(fillers: readonly Plugin[]): readonly FilledApp[] {
	const filled: FilledApp[] = [];
	const appsStub = plugin("apps").apply(() => ({
		app: (entry: FilledApp): void => {
			filled.push(entry);
		},
	}));
	const plugins = [appsStub, commandMenu, ...fillers];
	runtime()
		.builtInPlugins(...plugins)
		.state(new MemoryPluginStateStore(plugins.map(({ id }) => id)))
		.provide(backend, () => ({ module: ignored, moduleOf: ignored }))
		.provide(windows, () => ({ module: ignored, moduleOf: ignored, serverModule: ignored }))
		.provide(shell, () => ({ tabPage: ignored, layer: ignored, provider: ignored, frameModule: ignored }))
		.start();
	return filled;
}
