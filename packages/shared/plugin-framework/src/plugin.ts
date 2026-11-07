import type { SlotShape } from "./declared-slot";
import { DerivedFill, Fill } from "./fill";
import { PluginIdSchema } from "./profile";

interface PluginParts {
	readonly requiredPlugins: readonly Plugin[];
	readonly optionalPlugins: readonly Plugin[];
	readonly declaredSlots: readonly SlotShape[];
	readonly fills: readonly Fill[];
	readonly derivedFills: readonly DerivedFill[];
}

export class Plugin {
	constructor(
		readonly id: string,
		readonly parts: PluginParts,
	) {}

	require(...plugins: readonly Plugin[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			requiredPlugins: [...this.parts.requiredPlugins, ...plugins],
		});
	}

	optional(...plugins: readonly Plugin[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			optionalPlugins: [...this.parts.optionalPlugins, ...plugins],
		});
	}

	declare(...slots: readonly SlotShape[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			declaredSlots: [...this.parts.declaredSlots, ...slots],
		});
	}

	fill(...fills: readonly (Fill | DerivedFill)[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			fills: [...this.parts.fills, ...fills.filter((each) => each instanceof Fill)],
			derivedFills: [...this.parts.derivedFills, ...fills.filter((each) => each instanceof DerivedFill)],
		});
	}

	hasDependencyOn(pluginId: string): boolean {
		return [...this.parts.requiredPlugins, ...this.parts.optionalPlugins].some((each) => each.id === pluginId);
	}
}

export function plugin(id: string): Plugin {
	return new Plugin(PluginIdSchema.parse(id), {
		requiredPlugins: [],
		optionalPlugins: [],
		declaredSlots: [],
		fills: [],
		derivedFills: [],
	});
}

export function stampSlotName(ownerId: string, owned: SlotShape): string {
	return `${ownerId}/${owned.name}`;
}
