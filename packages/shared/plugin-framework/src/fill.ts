import type { z } from "zod";
import type { DeclaredSlot } from "./declared-slot";

export class Fill<S extends z.ZodType = z.ZodType> {
	constructor(
		readonly slot: DeclaredSlot<S>,
		readonly id: string,
		readonly item: z.input<S>,
	) {}
}

export interface FillDraft<S extends z.ZodType> {
	item(item: z.input<S>): Fill<S>;
}

export function fill<S extends z.ZodType>(slot: DeclaredSlot<S>, id: string): FillDraft<S> {
	return {
		item: (item) => new Fill(slot, id, item),
	};
}
