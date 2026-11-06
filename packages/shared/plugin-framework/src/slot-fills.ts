import type { SlotCardinality, SlotShape } from "./declared-slot";
import type { Fill } from "./fill";
import { stampSlotName } from "./plugin";
import type { Plugin } from "./plugin";

export interface ShownFill {
	readonly pluginId: string;
	readonly id: string;
	readonly item: unknown;
}

export interface FilledSlot {
	readonly slot: SlotShape;
	readonly fills: readonly ShownFill[];
}

export interface SlotFills {
	readonly slots: ReadonlyMap<string, FilledSlot>;
	readonly refusals: readonly string[];
}

interface SlotClaim {
	readonly slot: SlotShape;
	readonly ownerId: string;
	readonly stampedName: string;
}

interface ResolvedOwnership {
	readonly owned: readonly SlotClaim[];
	readonly bySlot: ReadonlyMap<SlotShape, SlotClaim>;
	readonly refusals: readonly string[];
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
	const resolved = resolveOwnership(claimsOf(started));
	const startedIds = new Set(started.map((each) => each.id));
	const outcomes = offersOf(started).map((offer) => fillOutcomeOf(offer, resolved.bySlot, startedIds));
	const fillsByStampedName = groupByStampedName(outcomes.filter(isParsedFill));

	return {
		slots: new Map(
			resolved.owned.map((claim) => [
				claim.stampedName,
				filledSlotOf(claim.slot, fillsByStampedName.get(claim.stampedName) ?? [], rankedIds),
			]),
		),
		refusals: [...resolved.refusals, ...outcomes.flatMap((each) => ("refusal" in each ? [each.refusal] : []))],
	};
}

function claimsOf(started: readonly Plugin[]): readonly SlotClaim[] {
	return started.flatMap((each) =>
		each.parts.declaredSlots.map((slot) => ({
			slot,
			ownerId: each.id,
			stampedName: stampSlotName(each.id, slot),
		})),
	);
}

function resolveOwnership(claims: readonly SlotClaim[]): ResolvedOwnership {
	const bySlot = new Map<SlotShape, SlotClaim>();
	const byStampedName = new Map<string, SlotClaim>();
	const refusals: string[] = [];

	for (const each of claims) {
		const firstClaim = bySlot.get(each.slot);

		if (firstClaim !== undefined) {
			refusals.push(
				DECLARED_TWICE.replace("{slot}", firstClaim.stampedName)
					.replace("{owner}", firstClaim.ownerId)
					.replace("{other}", each.ownerId),
			);
			continue;
		}

		if (byStampedName.has(each.stampedName)) {
			refusals.push(SAME_NAME_TWICE.replace("{plugin}", each.ownerId).replace("{name}", each.slot.name));
			continue;
		}

		bySlot.set(each.slot, each);
		byStampedName.set(each.stampedName, each);
	}

	return {
		owned: [...bySlot.values()],
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
	bySlot: ReadonlyMap<SlotShape, SlotClaim>,
	startedIds: ReadonlySet<string>,
): FillOutcome {
	const claim = bySlot.get(fill.slot);

	if (claim === undefined) {
		return isSlotOfAbsentOptional(filler, fill.slot, startedIds)
			? { skipped: true }
			: { refusal: NO_OWNER.replace("{plugin}", filler.id).replace("{name}", fill.slot.name) };
	}

	if (claim.ownerId !== filler.id && !filler.hasDependencyOn(claim.ownerId)) {
		return {
			refusal: NOT_DEPENDED_ON.replace("{plugin}", filler.id)
				.replace("{slot}", claim.stampedName)
				.replace("{owner}", claim.ownerId),
		};
	}

	const parsed = claim.slot.itemSchema.safeParse(fill.item);

	if (!parsed.success) {
		return { refusal: REFUSED_ITEM.replace("{plugin}", filler.id).replace("{slot}", claim.stampedName) };
	}

	return {
		pluginId: filler.id,
		id: fill.id,
		item: parsed.data,
		stampedName: claim.stampedName,
	};
}

function isSlotOfAbsentOptional(filler: Plugin, slot: SlotShape, startedIds: ReadonlySet<string>): boolean {
	return filler.parts.optionalPlugins.some(
		(each) => !startedIds.has(each.id) && each.parts.declaredSlots.includes(slot),
	);
}

function isParsedFill(outcome: FillOutcome): outcome is ParsedFill {
	return "stampedName" in outcome;
}

function groupByStampedName(fills: readonly ParsedFill[]): ReadonlyMap<string, readonly ParsedFill[]> {
	const grouped = new Map<string, readonly ParsedFill[]>();

	for (const each of fills) {
		grouped.set(each.stampedName, [...(grouped.get(each.stampedName) ?? []), each]);
	}

	return grouped;
}

function filledSlotOf(slot: SlotShape, fills: readonly ParsedFill[], rankedIds: readonly string[]): FilledSlot {
	const byRank = [...fills].sort((left, right) => rankedIds.indexOf(left.pluginId) - rankedIds.indexOf(right.pluginId));

	return {
		slot,
		fills: visibleFillsOf(slot.cardinality, byRank),
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
