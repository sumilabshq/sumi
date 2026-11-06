import type { DeclaredSlot } from "./declared-slot";
import type { Fill } from "./fill";
import { PluginIdSchema } from "./profile";

interface PluginParts {
	readonly requires: readonly Plugin[];
	readonly declares: readonly DeclaredSlot[];
	readonly fills: readonly Fill[];
}

export class Plugin {
	constructor(
		readonly id: string,
		readonly parts: PluginParts,
	) {}

	requires(...plugins: readonly Plugin[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			requires: [...this.parts.requires, ...plugins],
		});
	}

	declares(...slots: readonly DeclaredSlot[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			declares: [...this.parts.declares, ...slots],
		});
	}

	fills(...fills: readonly Fill[]): Plugin {
		return new Plugin(this.id, {
			...this.parts,
			fills: [...this.parts.fills, ...fills],
		});
	}
}

export function plugin(id: string): Plugin {
	return new Plugin(PluginIdSchema.parse(id), {
		requires: [],
		declares: [],
		fills: [],
	});
}
