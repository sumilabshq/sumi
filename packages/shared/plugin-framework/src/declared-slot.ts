import { z } from "zod";
import { DerivedFill, Fill } from "./fill";
import { sentenceOf } from "./sentence";

export type SlotCardinality = "single" | "list";

export interface SlotShape<S extends z.ZodType = z.ZodType, C extends SlotCardinality = SlotCardinality> {
	readonly name: string;
	readonly itemSchema: S;
	readonly cardinality: C;
}

export type SlotFillInput<S extends z.ZodType, C extends SlotCardinality> = C extends "list"
	? z.input<S> & { readonly id: string }
	: z.input<S>;

export type FilledItem<S extends z.ZodType> = z.output<S> & { readonly id: string };

export type Slot<S extends z.ZodType, C extends SlotCardinality> = SlotShape<S, C> & {
	(input: SlotFillInput<S, C>): Fill;
	<F extends z.ZodObject>(
		source: SlotShape<F>,
		derive: (items: readonly FilledItem<F>[]) => readonly SlotFillInput<S, C>[],
	): DerivedFill;
	list(): Slot<S, "list">;
};

export interface SlotDraft {
	item<S extends z.ZodType>(schema: S): Slot<S, "single">;
}

export const SlotNameSchema = z
	.string()
	.regex(/^[a-z][a-z0-9-]*$/, "a slot name is lowercase letters, digits and dashes, starting with a letter");

const LIST_NEEDS_ID = "a fill of the list slot {slot} needs a non-empty string id: {slot}({ id, … })";
const DERIVED_NEEDS_SLOT_AND_FUNCTION =
	"a fill of slot {slot} built from another slot takes that slot and a function: {slot}(SourceSlot, (items) => [ … ])";
const SOURCE_NOT_OBJECTS =
	"a fill of slot {slot} is built only from a slot whose items are objects, and slot {source} holds other items";

export function slot(name: string): SlotDraft {
	const slotName = SlotNameSchema.parse(name);
	return {
		item: (schema) => createSlot(slotName, schema, "single"),
	};
}

export function createFill(target: SlotShape, input: unknown): Fill {
	if (target.cardinality === "single") {
		return new Fill(target, target.name, input);
	}

	if (!hasStringId(input)) {
		throw new Error(sentenceOf(LIST_NEEDS_ID, { slot: target.name }));
	}

	const { id, ...item } = input;
	return new Fill(target, id, item);
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
	function fillOf(input: unknown): Fill;
	function fillOf(source: SlotShape, derive: (items: never) => unknown): DerivedFill;
	function fillOf(input: unknown, derive?: unknown): Fill | DerivedFill {
		return createFillOrDerived(created, input, derive);
	}

	const created = Object.assign(fillOf, slotPartsOf(name, itemSchema, cardinality));
	Object.defineProperty(created, "name", { value: name });
	return Object.freeze(created);
}

function slotPartsOf(
	name: string,
	itemSchema: z.ZodType,
	cardinality: SlotCardinality,
): Pick<Slot<z.ZodType, SlotCardinality>, "itemSchema" | "cardinality" | "list"> {
	return {
		itemSchema,
		cardinality,
		list: () => createSlot(name, itemSchema, "list"),
	};
}

function createFillOrDerived(target: SlotShape, input: unknown, derive: unknown): Fill | DerivedFill {
	if (derive === undefined) {
		return createFill(target, input);
	}

	return createDerivedFill(target, input, derive);
}

function createDerivedFill(target: SlotShape, source: unknown, derive: unknown): DerivedFill {
	if (!isSlotShape(source) || !isDeriveFunction(derive)) {
		throw new Error(sentenceOf(DERIVED_NEEDS_SLOT_AND_FUNCTION, { slot: target.name }));
	}

	const refusal = refuseNonObjectSource(target, source);

	if (refusal !== null) {
		throw new Error(refusal);
	}

	return new DerivedFill(target, source, {
		derive: (items) => Reflect.apply(derive, undefined, [items]),
	});
}

function refuseNonObjectSource(target: SlotShape, source: SlotShape): string | null {
	if (source.itemSchema instanceof z.ZodObject) {
		return null;
	}

	return sentenceOf(SOURCE_NOT_OBJECTS, {
		slot: target.name,
		source: source.name,
	});
}

function isSlotShape(value: unknown): value is SlotShape {
	return typeof value === "function" && "itemSchema" in value && "cardinality" in value;
}

function isDeriveFunction(value: unknown): value is (items: never) => unknown {
	return typeof value === "function";
}

function hasStringId(input: unknown): input is { readonly id: string } {
	return (
		typeof input === "object" && input !== null && "id" in input && typeof input.id === "string" && input.id !== ""
	);
}
