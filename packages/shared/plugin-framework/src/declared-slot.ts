import type { z } from "zod";
import { Fill } from "./fill";

export type SlotCardinality = "single" | "list";

export interface SlotShape<S extends z.ZodType = z.ZodType, C extends SlotCardinality = SlotCardinality> {
	readonly name: string;
	readonly item: S;
	readonly cardinality: C;
}

export type SlotValue<S extends z.ZodType, C extends SlotCardinality> = C extends "list"
	? z.input<S> & { readonly id: string }
	: z.input<S>;

export type Slot<S extends z.ZodType, C extends SlotCardinality> = SlotShape<S, C> & {
	(value: SlotValue<S, C>): Fill<S>;
	list(): Slot<S, "list">;
};

export interface SlotDraft {
	item<S extends z.ZodType>(schema: S): Slot<S, "single">;
}

const LIST_NEEDS_ID = "a fill of the list slot {slot} needs a string id: {slot}({ id, … })";

export function slot(name: string): SlotDraft {
	return {
		item: (schema) => declareSlot(name, schema, "single"),
	};
}

function declareSlot<S extends z.ZodType, C extends SlotCardinality>(name: string, item: S, cardinality: C): Slot<S, C>;
function declareSlot(name: string, item: z.ZodType, cardinality: SlotCardinality): Slot<z.ZodType, SlotCardinality> {
	const fillWith = (value: unknown): Fill => fillOf(declared, value);
	const declared = Object.assign(fillWith, {
		item,
		cardinality,
		list: () => declareSlot(name, item, "list"),
	});
	Object.defineProperty(declared, "name", { value: name });
	return Object.freeze(declared);
}

function fillOf(declared: SlotShape, value: unknown): Fill {
	if (declared.cardinality === "single") {
		return new Fill(declared, declared.name, value);
	}

	if (!isIdentified(value)) {
		throw new Error(LIST_NEEDS_ID.replace(/\{slot\}/g, declared.name));
	}

	return new Fill(declared, value.id, value);
}

function isIdentified(value: unknown): value is { readonly id: string } {
	return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string";
}
