import { z } from "zod";
import { Fill } from "./fill";

export type SlotCardinality = "single" | "list";

export interface SlotShape<S extends z.ZodType = z.ZodType, C extends SlotCardinality = SlotCardinality> {
	readonly name: string;
	readonly itemSchema: S;
	readonly cardinality: C;
}

export type SlotFillInput<S extends z.ZodType, C extends SlotCardinality> = C extends "list"
	? z.input<S> & { readonly id: string }
	: z.input<S>;

export type Slot<S extends z.ZodType, C extends SlotCardinality> = SlotShape<S, C> & {
	(input: SlotFillInput<S, C>): Fill;
	list(): Slot<S, "list">;
};

export interface SlotDraft {
	item<S extends z.ZodType>(schema: S): Slot<S, "single">;
}

export const SlotNameSchema = z
	.string()
	.regex(/^[a-z][a-z0-9-]*$/, "a slot name is lowercase letters, digits and dashes, starting with a letter");

const LIST_NEEDS_ID = "a fill of the list slot {slot} needs a non-empty string id: {slot}({ id, … })";

export function slot(name: string): SlotDraft {
	const slotName = SlotNameSchema.parse(name);
	return {
		item: (schema) => createSlot(slotName, schema, "single"),
	};
}

function createSlot<S extends z.ZodType, C extends SlotCardinality>(
	name: string,
	itemSchema: S,
	cardinality: C,
): Slot<S, C>;
function createSlot(
	name: string,
	itemSchema: z.ZodType,
	cardinality: SlotCardinality,
): Slot<z.ZodType, SlotCardinality> {
	const created = Object.assign((input: unknown): Fill => createFill(created, input), {
		itemSchema,
		cardinality,
		list: () => createSlot(name, itemSchema, "list"),
	});
	Object.defineProperty(created, "name", { value: name });
	return Object.freeze(created);
}

function createFill(target: SlotShape, input: unknown): Fill {
	if (target.cardinality === "single") {
		return new Fill(target, target.name, input);
	}

	if (!hasStringId(input)) {
		throw new Error(LIST_NEEDS_ID.replace(/\{slot\}/g, target.name));
	}

	const { id, ...item } = input;
	return new Fill(target, id, item);
}

function hasStringId(input: unknown): input is { readonly id: string } {
	return (
		typeof input === "object" && input !== null && "id" in input && typeof input.id === "string" && input.id !== ""
	);
}
