import type { PluginState, PluginStateStore } from "./plugin-state";

export class MemoryPluginStateStore implements PluginStateStore {
	readonly initialSource = "the given ids";

	constructor(
		private readonly initialEnabled: readonly string[],
		private kept: PluginState | null = null,
	) {}

	keptPluginState(): PluginState | null {
		return this.kept;
	}

	initialEnabledIds(): readonly string[] {
		return this.initialEnabled;
	}

	queuePluginStateSave(state: PluginState): void {
		this.kept = state;
	}
}
