import type { PluginState, PluginStateStore } from "./plugin-state";

export class MemoryPluginStateStore implements PluginStateStore {
	constructor(
		private readonly firstEnabled: readonly string[],
		private kept: PluginState | null = null,
	) {}

	keptPluginState(): PluginState | null {
		return this.kept;
	}

	firstEnabledIds(): readonly string[] {
		return this.firstEnabled;
	}

	savePluginState(state: PluginState): void {
		this.kept = state;
	}
}
