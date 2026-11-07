import type { SlotCardinality, SlotShape } from "./declared-slot";
import type { Fill } from "./fill";
import type { Plugin } from "./plugin";
import { sentenceOf } from "./sentence";

export interface ShownFill {
	readonly pluginId: string;
	readonly id: string;
	readonly item: unknown;
}

export interface FilledSlot {
	readonly slot: SlotShape;
	readonly fills: readonly ShownFill[];
}

export interface SlotClaim {
	readonly slot: SlotShape;
	readonly ownerId: string;
	readonly stampedName: string;
}

export interface ResolvedOwnership {
	readonly owned: readonly SlotClaim[];
	readonly bySlot: ReadonlyMap<SlotShape, SlotClaim>;
	readonly refusals: readonly string[];
}

export interface FillOffer {
	readonly filler: Plugin;
	readonly fill: Fill;
}

export interface ParsedFill extends ShownFill {
	readonly stampedName: string;
}

export type FillOutcome = ParsedFill | { readonly refusal: string } | { readonly skipped: true };

const NO_OWNER = "plugin {plugin} fills slot {name}, which no started plugin declares";
const NOT_DEPENDED_ON = "plugin {plugin} fills slot {slot} without requiring {owner} or marking it optional";
const REFUSED_ITEM = "plugin {plugin} fills slot {slot} with an item the slot refuses";

export function fillOutcomeOf(
	offer: FillOffer,
	bySlot: ReadonlyMap<SlotShape, SlotClaim>,
	startedIds: ReadonlySet<string>,
): FillOutcome {
	const claim = bySlot.get(offer.fill.slot);

	if (claim === undefined) {
		return unclaimedOutcomeOf(offer, startedIds);
	}

	const refusal = refuseFiller(offer.filler, claim);

	if (refusal !== null) {
		return { refusal };
	}

	return parsedOutcomeOf(offer, claim);
}

export function isParsedFill(outcome: FillOutcome): outcome is ParsedFill {
	return "stampedName" in outcome;
}

export function filledSlotOf(slot: SlotShape, fills: readonly ParsedFill[], rankedIds: readonly string[]): FilledSlot {
	const byRank = [...fills].sort((left, right) => rankedIds.indexOf(left.pluginId) - rankedIds.indexOf(right.pluginId));

	return {
		slot,
		fills: visibleFillsOf(slot.cardinality, byRank),
	};
}

function unclaimedOutcomeOf({ filler, fill }: FillOffer, startedIds: ReadonlySet<string>): FillOutcome {
	if (isSlotOfAbsentOptional(filler, fill.slot, startedIds)) {
		return { skipped: true };
	}

	return {
		refusal: sentenceOf(NO_OWNER, {
			plugin: filler.id,
			name: fill.slot.name,
		}),
	};
}

function refuseFiller(filler: Plugin, claim: SlotClaim): string | null {
	if (claim.ownerId === filler.id || filler.hasDependencyOn(claim.ownerId)) {
		return null;
	}

	return sentenceOf(NOT_DEPENDED_ON, {
		plugin: filler.id,
		slot: claim.stampedName,
		owner: claim.ownerId,
	});
}

function parsedOutcomeOf({ filler, fill }: FillOffer, claim: SlotClaim): FillOutcome {
	const parsed = claim.slot.itemSchema.safeParse(fill.item);

	if (!parsed.success) {
		return refusedItemOf(filler, claim);
	}

	return {
		pluginId: filler.id,
		id: fill.id,
		item: parsed.data,
		stampedName: claim.stampedName,
	};
}

function refusedItemOf(filler: Plugin, claim: SlotClaim): FillOutcome {
	return {
		refusal: sentenceOf(REFUSED_ITEM, {
			plugin: filler.id,
			slot: claim.stampedName,
		}),
	};
}

function isSlotOfAbsentOptional(filler: Plugin, slot: SlotShape, startedIds: ReadonlySet<string>): boolean {
	return filler.parts.optionalPlugins.some(
		(each) => !startedIds.has(each.id) && each.parts.declaredSlots.includes(slot),
	);
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
