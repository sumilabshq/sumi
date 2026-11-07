import type { SlotShape } from "./declared-slot";
import { derivedOutcomesOf } from "./derived-fills";
import type { FillResolution } from "./derived-fills";
import { filledSlotOf, fillOutcomeOf, isParsedFill } from "./fill-outcome";
import type { FilledSlot, FillOffer, FillOutcome, ParsedFill, ResolvedOwnership, SlotClaim } from "./fill-outcome";
import { stampSlotName } from "./plugin";
import type { Plugin } from "./plugin";
import { sentenceOf } from "./sentence";

export interface SlotFills {
	readonly slots: ReadonlyMap<string, FilledSlot>;
	readonly refusals: readonly string[];
}

const DECLARED_TWICE = "slot {slot} is declared by {owner} and again by {other}";
const SAME_NAME_TWICE = "plugin {plugin} declares two slots named {name}";

export function slotFillsOf(started: readonly Plugin[], rankedIds: readonly string[]): SlotFills {
	const resolved = resolveOwnership(claimsOf(started));
	const outcomes = outcomesOf(started, {
		ownership: resolved,
		startedIds: new Set(started.map((each) => each.id)),
		rankedIds,
	});
	const fillsByStampedName = groupByStampedName(outcomes.filter(isParsedFill));

	return {
		slots: slotsOf(resolved.owned, fillsByStampedName, rankedIds),
		refusals: [...resolved.refusals, ...outcomes.flatMap((each) => ("refusal" in each ? [each.refusal] : []))],
	};
}

function slotsOf(
	owned: readonly SlotClaim[],
	fillsByStampedName: ReadonlyMap<string, readonly ParsedFill[]>,
	rankedIds: readonly string[],
): ReadonlyMap<string, FilledSlot> {
	return new Map(
		owned.map((claim) => [
			claim.stampedName,
			filledSlotOf(claim.slot, fillsByStampedName.get(claim.stampedName) ?? [], rankedIds),
		]),
	);
}

function outcomesOf(started: readonly Plugin[], resolution: FillResolution): readonly FillOutcome[] {
	const plainOutcomes = offersOf(started).map((offer) =>
		fillOutcomeOf(offer, resolution.ownership.bySlot, resolution.startedIds),
	);
	return [...plainOutcomes, ...derivedOutcomesOf(started, plainOutcomes.filter(isParsedFill), resolution)];
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
				sentenceOf(DECLARED_TWICE, {
					slot: firstClaim.stampedName,
					owner: firstClaim.ownerId,
					other: each.ownerId,
				}),
			);
			continue;
		}

		if (byStampedName.has(each.stampedName)) {
			refusals.push(
				sentenceOf(SAME_NAME_TWICE, {
					plugin: each.ownerId,
					name: each.slot.name,
				}),
			);
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

function groupByStampedName(fills: readonly ParsedFill[]): ReadonlyMap<string, readonly ParsedFill[]> {
	const grouped = new Map<string, readonly ParsedFill[]>();

	for (const each of fills) {
		grouped.set(each.stampedName, [...(grouped.get(each.stampedName) ?? []), each]);
	}

	return grouped;
}
