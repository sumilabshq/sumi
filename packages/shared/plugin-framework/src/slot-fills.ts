import type { SlotCardinality, SlotShape } from "./declared-slot";
import type { Fill } from "./fill";
import { stampedSlotName } from "./plugin";
import type { Plugin } from "./plugin";

export interface ShownFill {
	readonly pluginId: string;
	readonly id: string;
	readonly item: unknown;
}

export interface FilledSlot {
	readonly slot: SlotShape;
	readonly ownerId: string;
	readonly fills: readonly ShownFill[];
}

export interface SlotFills {
	readonly slots: ReadonlyMap<string, FilledSlot>;
	readonly refusals: readonly string[];
}

interface SlotOwnership {
	readonly slot: SlotShape;
	readonly ownerId: string;
	readonly stampedName: string;
}

interface FillOffer {
	readonly filler: Plugin;
	readonly fill: Fill;
}

interface ParsedFill extends ShownFill {
	readonly stampedName: string;
}

type FillOutcome = ParsedFill | { readonly refusal: string } | { readonly skipped: true };

const DECLARED_TWICE = "slot {slot} is declared by {owner} and again by {other}";
const SAME_NAME_TWICE = "plugin {plugin} declares two slots named {name}";
const NO_OWNER = "plugin {plugin} fills slot {name}, which no started plugin declares";
const NOT_DEPENDED_ON = "plugin {plugin} fills slot {slot} without requiring {owner} or marking it optional";
const REFUSED_ITEM = "plugin {plugin} fills slot {slot} with an item the slot refuses";

export function slotFillsOf(started: readonly Plugin[], rankedIds: readonly string[]): SlotFills {
	const declarations = declarationsOf(started);
	const owned = ownedOf(declarations);
	const startedIds = new Set(started.map((each) => each.id));
	const outcomes = offersOf(started).map((offer) => fillOutcomeOf(offer, owned.bySlot, startedIds));
	const fillsByName = groupedByNameOf(outcomes.filter(isParsedFill));

	return {
		slots: new Map(
			owned.ownerships.map((ownership) => [
				ownership.stampedName,
				filledSlotOf(ownership, fillsByName.get(ownership.stampedName) ?? [], rankedIds),
			]),
		),
		refusals: [...owned.refusals, ...outcomes.flatMap((each) => ("refusal" in each ? [each.refusal] : []))],
	};
}

function declarationsOf(started: readonly Plugin[]): readonly SlotOwnership[] {
	return started.flatMap((each) =>
		each.parts.declared.map((slot) => ({
			slot,
			ownerId: each.id,
			stampedName: stampedSlotName(each.id, slot),
		})),
	);
}

function ownedOf(declarations: readonly SlotOwnership[]): {
	readonly ownerships: readonly SlotOwnership[];
	readonly bySlot: ReadonlyMap<SlotShape, SlotOwnership>;
	readonly refusals: readonly string[];
} {
	const bySlot = new Map<SlotShape, SlotOwnership>();
	const byName = new Map<string, SlotOwnership>();
	const refusals: string[] = [];

	for (const each of declarations) {
		const owner = bySlot.get(each.slot);

		if (owner !== undefined) {
			refusals.push(
				DECLARED_TWICE.replace("{slot}", owner.stampedName)
					.replace("{owner}", owner.ownerId)
					.replace("{other}", each.ownerId),
			);
			continue;
		}

		if (byName.has(each.stampedName)) {
			refusals.push(SAME_NAME_TWICE.replace("{plugin}", each.ownerId).replace("{name}", each.slot.name));
			continue;
		}

		bySlot.set(each.slot, each);
		byName.set(each.stampedName, each);
	}

	return {
		ownerships: [...bySlot.values()],
		bySlot,
		refusals,
	};
}

function offersOf(started: readonly Plugin[]): readonly FillOffer[] {
	return started.flatMap((filler) =>
		filler.parts.fills.map((fill) => ({
			filler,
			fill,
		})),
	);
}

function fillOutcomeOf(
	{ filler, fill }: FillOffer,
	bySlot: ReadonlyMap<SlotShape, SlotOwnership>,
	startedIds: ReadonlySet<string>,
): FillOutcome {
	const ownership = bySlot.get(fill.slot);

	if (ownership === undefined) {
		return isForAbsentOptional(filler, fill.slot, startedIds)
			? { skipped: true }
			: { refusal: NO_OWNER.replace("{plugin}", filler.id).replace("{name}", fill.slot.name) };
	}

	if (ownership.ownerId !== filler.id && !filler.dependsOn(ownership.ownerId)) {
		return {
			refusal: NOT_DEPENDED_ON.replace("{plugin}", filler.id)
				.replace("{slot}", ownership.stampedName)
				.replace("{owner}", ownership.ownerId),
		};
	}

	const parsed = ownership.slot.item.safeParse(fill.item);

	if (!parsed.success) {
		return { refusal: REFUSED_ITEM.replace("{plugin}", filler.id).replace("{slot}", ownership.stampedName) };
	}

	return {
		pluginId: filler.id,
		id: fill.id,
		item: parsed.data,
		stampedName: ownership.stampedName,
	};
}

function isForAbsentOptional(filler: Plugin, slot: SlotShape, startedIds: ReadonlySet<string>): boolean {
	return filler.parts.optional.some((each) => !startedIds.has(each.id) && each.parts.declared.includes(slot));
}

function isParsedFill(outcome: FillOutcome): outcome is ParsedFill {
	return "stampedName" in outcome;
}

function groupedByNameOf(fills: readonly ParsedFill[]): ReadonlyMap<string, readonly ParsedFill[]> {
	const grouped = new Map<string, readonly ParsedFill[]>();

	for (const each of fills) {
		grouped.set(each.stampedName, [...(grouped.get(each.stampedName) ?? []), each]);
	}

	return grouped;
}

function filledSlotOf(
	ownership: SlotOwnership,
	fills: readonly ParsedFill[],
	rankedIds: readonly string[],
): FilledSlot {
	const byRank = [...fills].sort((left, right) => rankedIds.indexOf(left.pluginId) - rankedIds.indexOf(right.pluginId));

	return {
		slot: ownership.slot,
		ownerId: ownership.ownerId,
		fills: visibleFillsOf(ownership.slot.cardinality, byRank),
	};
}

function visibleFillsOf(cardinality: SlotCardinality, byRank: readonly ParsedFill[]): readonly ShownFill[] {
	if (cardinality === "single") {
		return byRank.slice(0, 1).map(shownFillOf);
	}

	const winners = new Map<string, ParsedFill>();

	for (const each of byRank) {
		if (!winners.has(each.id)) {
			winners.set(each.id, each);
		}
	}

	return [...winners.values()].map(shownFillOf);
}

function shownFillOf({ pluginId, id, item }: ParsedFill): ShownFill {
	return {
		pluginId,
		id,
		item,
	};
}
