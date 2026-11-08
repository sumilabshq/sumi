import { prefixedModule } from "@widgetarium/data-framework";
import type { CallerFacts } from "@widgetarium/plugin-framework";
import type { Backend, Shell, Windows } from "@sumi/sumi-host-plugin";
import type {
	BackgroundModule,
	FrameModule,
	PluginTabPage,
	WindowLayer,
	WindowModule,
	WindowProvider,
	WindowServerModule,
} from "./sumi-plugins.js";

export interface HostRegistrations {
	readonly backgroundModules: BackgroundModule[];
	readonly windowModules: WindowModule[];
	readonly windowServerModules: WindowServerModule[];
	readonly tabPages: PluginTabPage[];
	readonly windowLayers: WindowLayer[];
	readonly windowProviders: WindowProvider[];
	readonly frameModules: FrameModule[];
}

export function emptyHostRegistrations(): HostRegistrations {
	return {
		backgroundModules: [],
		windowModules: [],
		windowServerModules: [],
		tabPages: [],
		windowLayers: [],
		windowProviders: [],
		frameModules: [],
	};
}

export function backendFor(registrations: HostRegistrations): (caller: CallerFacts) => Backend {
	return ({ prefix }) => ({
		module: (module, contract) => {
			registrations.backgroundModules.push({
				contract,
				prefix,
				exposes: [],
				moduleOf: () => prefixedModule(module, prefix),
			});
		},
		moduleOf: (build, contract) => {
			registrations.backgroundModules.push({
				contract,
				prefix,
				exposes: [],
				moduleOf: (offers) => prefixedModule(build(offers), prefix),
			});
		},
	});
}

export function windowsFor(registrations: HostRegistrations): (caller: CallerFacts) => Windows {
	return ({ pluginId, prefix }) => ({
		module: (module) => {
			registrations.windowModules.push({ moduleOf: () => prefixedModule(module, prefix) });
		},
		moduleOf: (build) => {
			registrations.windowModules.push({ moduleOf: (offers) => prefixedModule(build(offers), prefix) });
		},
		serverModule: (build) => {
			registrations.windowServerModules.push({
				id: `${pluginId}.server-${registrations.windowServerModules.length}`,
				moduleOf: (offers) => prefixedModule(build(offers), prefix),
			});
		},
	});
}

export function shellFor(registrations: HostRegistrations): (caller: CallerFacts) => Shell {
	return ({ pluginId, prefix }) => ({
		tabPage: (drawn) => {
			registrations.tabPages.push({ pluginId, drawn });
		},
		layer: (layer) => {
			registrations.windowLayers.push({ id: `${pluginId}.layer-${registrations.windowLayers.length}`, layer });
		},
		provider: (providerOf) => {
			registrations.windowProviders.push({
				id: `${pluginId}.provider-${registrations.windowProviders.length}`,
				providerOf,
			});
		},
		frameModule: (contract, servingOf) => {
			registrations.frameModules.push({ id: `${pluginId}.${contract.name}`, contract, prefix, servingOf });
		},
	});
}
