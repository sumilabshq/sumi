import type { SlotShape } from "./declared-slot";

export class Fill {
	constructor(
		readonly slot: SlotShape,
		readonly id: string,
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
