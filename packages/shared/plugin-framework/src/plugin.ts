import type { SlotShape } from "./declared-slot";
import type { Fill } from "./fill";
import { PluginIdSchema } from "./profile";

interface PluginParts {
	readonly required: readonly Plugin[];
	readonly optional: readonly Plugin[];
	readonly declared: readonly SlotShape[];
	readonly fills: readonly Fill[];
}

export class Plugin {
	constructor(
		readonly id: string,
		readonly parts: PluginParts,
	) {}

	require(...plugins: readonly Plugin[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			required: [...this.parts.required, ...plugins],
		});
	}

	optional(...plugins: readonly Plugin[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			optional: [...this.parts.optional, ...plugins],
		});
	}

	declare(...slots: readonly SlotShape[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			declared: [...this.parts.declared, ...slots],
		});
	}

	fill(...fills: readonly Fill[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			fills: [...this.parts.fills, ...fills],
		});
	}

	dependsOn(pluginId: string): boolean {
		return [...this.parts.required, ...this.parts.optional].some((each) => each.id === pluginId);
	}
}

export function plugin(id: string): Plugin {
	return new Plugin(PluginIdSchema.parse(id), {
		required: [],
		optional: [],
		declared: [],
		fills: [],
	});
}

export function stampedSlotName(ownerId: string, declared: SlotShape): string {
	return `${ownerId}/${declared.name}`;
}
