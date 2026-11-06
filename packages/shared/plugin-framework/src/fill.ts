import type { SlotShape } from "./declared-slot";

export class Fill {
	constructor(
		readonly slot: SlotShape,
		readonly id: string,
		readonly item: unknown,
	) {}
}
