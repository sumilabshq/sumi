import type { SlotShape } from "./declared-slot";
import { DerivedFill, Fill } from "./fill";
import { fullNameOf, unnamedIdentity } from "./identity";
import type { Identity } from "./identity";

interface PluginParts {
	readonly requiredPlugins: readonly Plugin[];
	readonly optionalPlugins: readonly Plugin[];
	readonly declaredSlots: readonly SlotShape[];
	readonly fills: readonly Fill[];
	readonly derivedFills: readonly DerivedFill[];
}

const PLUGIN = "a plugin";

export class Plugin {
	constructor(
		readonly identity: Identity,
		readonly parts: PluginParts,
	) {}

	get id(): string {
		return fullNameOf(this.identity, PLUGIN);
	}

	require(...plugins: readonly Plugin[]): Plugin {
		return new Plugin(this.identity, {
			...this.parts,
			requiredPlugins: [...this.parts.requiredPlugins, ...plugins],
		});
	}

	optional(...plugins: readonly Plugin[]): Plugin {
		return new Plugin(this.identity, {
			...this.parts,
			optionalPlugins: [...this.parts.optionalPlugins, ...plugins],
		});
	}

	declare(...slots: readonly SlotShape[]): Plugin {
		return new Plugin(this.identity, {
			...this.parts,
			declaredSlots: [...this.parts.declaredSlots, ...slots],
		});
	}

	fill(...fills: readonly (Fill | DerivedFill)[]): Plugin {
		return new Plugin(this.identity, {
			...this.parts,
			fills: [...this.parts.fills, ...fills.filter((each) => each instanceof Fill)],
			derivedFills: [...this.parts.derivedFills, ...fills.filter((each) => each instanceof DerivedFill)],
		});
	}

	hasDependencyOn(pluginId: string): boolean {
		return [...this.parts.requiredPlugins, ...this.parts.optionalPlugins].some((each) => each.id === pluginId);
	}
}

export function plugin(): Plugin {
	return new Plugin(unnamedIdentity(), {
		requiredPlugins: [],
		optionalPlugins: [],
		declaredSlots: [],
		fills: [],
		derivedFills: [],
	});
}
