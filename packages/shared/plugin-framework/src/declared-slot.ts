import { z } from "zod";
import { DerivedFill, Fill } from "./fill";
import { fullNameOf, unnamedIdentity } from "./identity";
import type { Identity } from "./identity";
import { sentenceOf } from "./sentence";

export type SlotCardinality = "single" | "list";

export interface SlotShape<S extends z.ZodType = z.ZodType, C extends SlotCardinality = SlotCardinality> {
	readonly identity: Identity;
	readonly name: string;
	readonly label: string;
	readonly itemSchema: S;
	readonly cardinality: C;
}

export type ListItemInput<S extends z.ZodType> = z.input<S> & { readonly id: string };

export type FilledItem<S extends z.ZodType> = z.output<S> & { readonly id: string };

export type ItemsDerive<F extends z.ZodObject, A> = (items: readonly FilledItem<F>[]) => A;

export interface SlotDraft {
	item<S extends z.ZodType>(schema: S): SingleSlot<S>;
}

const SLOT = "a slot";
const UNNAMED_LABEL = "(not named yet)";
const LIST_NEEDS_ID = "a fill of slot {slot}, a list, needs a non-empty string id: add({ id, … })";
const DERIVED_NEEDS_SLOT_AND_FUNCTION =
	"a fill of slot {slot} built from another slot takes that slot and a function: addFrom(sourceSlot, (items) => [ … ])";
const SOURCE_NOT_OBJECTS =
	"a fill of slot {slot} is built only from a slot whose items are objects, and slot {source} holds other items";

abstract class DeclaredSlot<S extends z.ZodType, C extends SlotCardinality> implements SlotShape<S, C> {
	abstract readonly cardinality: C;

	constructor(
		readonly identity: Identity,
		readonly itemSchema: S,
	) {}

	get name(): string {
		return fullNameOf(this.identity, SLOT);
	}

	get label(): string {
		return this.identity.name === null ? UNNAMED_LABEL : this.name;
	}
}

export class ListSlot<S extends z.ZodType> extends DeclaredSlot<S, "list"> {
	readonly cardinality = "list";

	add(item: ListItemInput<S>): Fill {
		return createFill(this, item);
	}

	addFrom<F extends z.ZodObject>(
		source: SlotShape<F>,
		derive: ItemsDerive<F, readonly ListItemInput<S>[]>,
	): DerivedFill {
		return createDerivedFill(this, source, derive, (answered) => answered);
	}
}

export class SingleSlot<S extends z.ZodType> extends DeclaredSlot<S, "single"> {
	readonly cardinality = "single";

	set(item: z.input<S>): Fill {
		return createFill(this, item);
	}

	setFrom<F extends z.ZodObject>(source: SlotShape<F>, derive: ItemsDerive<F, z.input<S>>): DerivedFill {
		return createDerivedFill(this, source, derive, (answered) => [answered]);
	}

	list(): ListSlot<S> {
		return new ListSlot(this.identity, this.itemSchema);
	}
}

export function slot(): SlotDraft {
	return {
		item: (schema) => new SingleSlot(unnamedIdentity(), schema),
	};
}

export function createFill(target: SlotShape, input: unknown): Fill {
	if (target.cardinality === "single") {
		return new Fill(target, null, input);
	}

	if (!hasStringId(input)) {
		throw new Error(sentenceOf(LIST_NEEDS_ID, { slot: target.label }));
	}

	const { id, ...item } = input;
	return new Fill(target, id, item);
}

function createDerivedFill(
	target: SlotShape,
	source: unknown,
	derive: unknown,
	asList: (answered: unknown) => unknown,
): DerivedFill {
	if (!isSlotShape(source) || !isDeriveFunction(derive)) {
		throw new Error(sentenceOf(DERIVED_NEEDS_SLOT_AND_FUNCTION, { slot: target.label }));
	}

	if (!(source.itemSchema instanceof z.ZodObject)) {
		throw new Error(sentenceOf(SOURCE_NOT_OBJECTS, { slot: target.label, source: source.label }));
	}

	return new DerivedFill(target, source, {
		derive: (items) => asList(Reflect.apply(derive, undefined, [items])),
	});
}

function isSlotShape(value: unknown): value is SlotShape {
	return value instanceof DeclaredSlot;
}

function isDeriveFunction(value: unknown): value is (items: never) => unknown {
	return typeof value === "function";
}

function hasStringId(input: unknown): input is { readonly id: string } {
	return (
		typeof input === "object" && input !== null && "id" in input && typeof input.id === "string" && input.id !== ""
	);
}
