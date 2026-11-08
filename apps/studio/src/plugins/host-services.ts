import { prefixedModule } from "@widgetarium/data-framework";
import type { CallerFacts } from "@widgetarium/plugin-framework";
import type { Agents, Backend, Shell, Windows } from "@sumi/sumi-host-plugin";
import type {
	AgentMcpServer,
	BackgroundModule,
	FrameModule,
	HostServer,
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
	readonly servers: HostServer[];
	readonly agentMcpServers: AgentMcpServer[];
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
		servers: [],
		agentMcpServers: [],
	};
}

export function backendFor(registrations: HostRegistrations): (caller: CallerFacts) => Backend {
	return ({ prefix }) => ({
		module: (module, contract) => {
			registrations.backgroundModules.push({
				contract,
				prefix,
				moduleOf: () => prefixedModule(module, prefix),
			});
		},
		moduleOf: (build, contract) => {
			registrations.backgroundModules.push({
				contract,
				prefix,
				moduleOf: (offers) => prefixedModule(build(offers), prefix),
			});
		},
		server: ({ name, modules, serve }) => {
			registrations.servers.push({
				name,
				prefix,
				modules,
				serve: (runtime) => serve(runtime),
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

export function agentsFor(registrations: HostRegistrations): (caller: CallerFacts) => Agents {
	return () => ({
		mcpServer: (serve) => {
			registrations.agentMcpServers.push({ serve });
		},
	});
}
