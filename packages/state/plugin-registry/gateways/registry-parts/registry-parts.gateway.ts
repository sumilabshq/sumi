import type { PluginRegistryConfig } from "../../shared/host/registry.host.js";
import { MemorySwitchesGateway } from "../switches/memory.gateway.js";
import { SwitchesGateway } from "../switches/switches.gateway.js";
import { TauriSwitchesGateway } from "../switches/tauri.gateway.js";

export type RegistryParts = {
	readonly switches: SwitchesGateway;
	readonly catalogue: PluginRegistryConfig["catalogue"];
	readonly startedIds: PluginRegistryConfig["startedIds"];
};

export function registryPartsOn({ config }: { readonly config: PluginRegistryConfig }): RegistryParts {
	return {
		switches: config.tauri === undefined ? new MemorySwitchesGateway() : new TauriSwitchesGateway(config.tauri.store),
		catalogue: config.catalogue,
		startedIds: config.startedIds,
	};
}
