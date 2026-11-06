import type { z } from "zod";

export type SlotCardinality = "single" | "list";

export class DeclaredSlot<S extends z.ZodType = z.ZodType> {
	constructor(
		readonly name: string,
		readonly item: S,
		readonly cardinality: SlotCardinality,
	) {}

	list(): DeclaredSlot<S> {
		return new DeclaredSlot(this.name, this.item, "list");
	}
}

export interface SlotDraft {
	item<S extends z.ZodType>(schema: S): DeclaredSlot<S>;
}

export function slot(name: string): SlotDraft {
	return {
		item: (schema) => new DeclaredSlot(name, schema, "single"),
	};
}
