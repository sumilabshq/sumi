import type { SlotShape } from "./declared-slot";
import { DerivedFill, Fill } from "./fill";
import { checkedAlias, checkedName } from "./identity";

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
		readonly slotOwnerId: string = id,
	) {}

	get isAliased(): boolean {
		return this.id !== this.slotOwnerId;
	}

	aliased(alias: string): Plugin {
		return new Plugin(checkedAlias(alias), this.parts, this.id);
	}

	require(...plugins: readonly Plugin[]): Plugin {
		return new Plugin(
			this.id,
			{
				...this.parts,
				requiredPlugins: [...this.parts.requiredPlugins, ...plugins],
			},
			this.slotOwnerId,
		);
	}

	optional(...plugins: readonly Plugin[]): Plugin {
		return new Plugin(
			this.id,
			{
				...this.parts,
				optionalPlugins: [...this.parts.optionalPlugins, ...plugins],
			},
			this.slotOwnerId,
		);
	}

	declare(...slots: readonly SlotShape[]): Plugin {
		return new Plugin(
			this.id,
			{
				...this.parts,
				declaredSlots: [...this.parts.declaredSlots, ...slots],
			},
			this.slotOwnerId,
		);
	}

	fill(...fills: readonly (Fill | DerivedFill)[]): Plugin {
		return new Plugin(
			this.id,
			{
				...this.parts,
				fills: [...this.parts.fills, ...fills.filter((each) => each instanceof Fill)],
				derivedFills: [...this.parts.derivedFills, ...fills.filter((each) => each instanceof DerivedFill)],
			},
			this.slotOwnerId,
		);
	}

	hasDependencyOn(pluginId: string): boolean {
		return [...this.parts.requiredPlugins, ...this.parts.optionalPlugins].some((each) => each.id === pluginId);
	}
}

export function plugin(id: string): Plugin {
	return new Plugin(checkedName(id), {
		requiredPlugins: [],
		optionalPlugins: [],
		declaredSlots: [],
		fills: [],
		derivedFills: [],
	});
}
