import type { SlotComponent } from "./ui-slot";

export interface SlotFilled {
	readonly slot: string;
	readonly pluginId: string;
	readonly kind: "replace" | "add";
	readonly component: SlotComponent<never>;
}

export interface FilledSlot {
	readonly replacement: SlotComponent<never> | null;
	readonly added: readonly SlotComponent<never>[];
}

const UNFILLED: FilledSlot = {
	replacement: null,
	added: [],
};

export class SlotFills {
	constructor(private readonly filled: readonly SlotFilled[]) {}

	fillOf(slot: string): FilledSlot {
		const own = this.filled.filter((each) => each.slot === slot);

		if (own.length === 0) {
			return UNFILLED;
		}

		return {
			replacement: own.find(({ kind }) => kind === "replace")?.component ?? null,
			added: own.filter(({ kind }) => kind === "add").map(({ component }) => component),
		};
	}
}

export const NO_SLOT_FILLS = new SlotFills([]);
