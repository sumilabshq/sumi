import type { SlotShape } from "./declared-slot";

export class Fill {
	constructor(
		readonly slot: SlotShape,
		readonly listId: string | null,
		readonly item: unknown,
	) {}
}

export interface ItemsDerivation {
	readonly derive: (items: readonly unknown[]) => unknown;
}

export class DerivedFill {
	constructor(
		readonly slot: SlotShape,
		readonly source: SlotShape,
		readonly derivation: ItemsDerivation,
	) {}
}
