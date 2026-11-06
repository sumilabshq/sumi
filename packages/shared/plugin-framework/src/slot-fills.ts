import type { DeclaredSlot, SlotCardinality } from "./declared-slot";
import type { Fill } from "./fill";
import type { Plugin } from "./plugin";

export interface ShownFill {
	readonly pluginId: string;
	readonly id: string;
	readonly item: unknown;
}

export interface FilledSlot {
	readonly slot: DeclaredSlot;
	readonly fills: readonly ShownFill[];
}

export interface SlotFills {
	readonly slots: ReadonlyMap<string, FilledSlot>;
	readonly refusals: readonly string[];
}

interface SlotOwnership {
	readonly slot: DeclaredSlot;
	readonly ownerId: string;
}

type Ownerships = ReadonlyMap<string, SlotOwnership>;

interface FillOffer {
	readonly pluginId: string;
	readonly fill: Fill;
}

interface ParsedFill extends ShownFill {
	readonly slotName: string;
}

export function slotFillsOf(started: readonly Plugin[], rankedIds: readonly string[]): SlotFills {
	const declarations = declarationsOf(started);
	const ownerships = new Map(firstDeclarationsOf(declarations).map((each) => [each.slot.name, each] as const));
	const parsed = offersOf(started).map((offer) => parsedFillOf(offer, ownerships));
	const fillsBySlot = groupedBySlotOf(parsed.filter(isParsedFill));

	return {
		slots: new Map(
			[...ownerships].map(([name, ownership]) => [
				name,
				filledSlotOf(ownership.slot, fillsBySlot.get(name) ?? [], rankedIds),
			]),
		),
		refusals: [...repeatedDeclarationsOf(declarations), ...parsed.filter(isRefusal)],
	};
}

function declarationsOf(started: readonly Plugin[]): readonly SlotOwnership[] {
	return started.flatMap((each) =>
		each.parts.declares.map((slot) => ({
			slot,
			ownerId: each.id,
		})),
	);
}

function firstDeclarationsOf(declarations: readonly SlotOwnership[]): readonly SlotOwnership[] {
	return declarations.filter(
		(each, at) => declarations.findIndex((other) => other.slot.name === each.slot.name) === at,
	);
}

function repeatedDeclarationsOf(declarations: readonly SlotOwnership[]): readonly string[] {
	return declarations.flatMap((each, at) => {
		const first = declarations.find((other) => other.slot.name === each.slot.name);
		const isRepeat = first !== undefined && declarations.indexOf(first) !== at;
		return isRepeat ? [`slot ${each.slot.name} is declared by ${first.ownerId} and again by ${each.ownerId}`] : [];
	});
}

function offersOf(started: readonly Plugin[]): readonly FillOffer[] {
	return started.flatMap((each) =>
		each.parts.fills.map((fill) => ({
			pluginId: each.id,
			fill,
		})),
	);
}

function parsedFillOf({ pluginId, fill }: FillOffer, ownerships: Ownerships): ParsedFill | string {
	const ownership = ownerships.get(fill.slot.name);

	if (ownership === undefined) {
		return `plugin ${pluginId} fills slot ${fill.slot.name}, which no started plugin declares`;
	}

	const parsed = ownership.slot.item.safeParse(fill.item);

	if (!parsed.success) {
		return `plugin ${pluginId} fills slot ${fill.slot.name} with an item the slot refuses`;
	}

	return {
		pluginId,
		id: fill.id,
		item: parsed.data,
		slotName: fill.slot.name,
	};
}

function isParsedFill(parsed: ParsedFill | string): parsed is ParsedFill {
	return typeof parsed !== "string";
}

function isRefusal(parsed: ParsedFill | string): parsed is string {
	return typeof parsed === "string";
}

function groupedBySlotOf(fills: readonly ParsedFill[]): ReadonlyMap<string, readonly ParsedFill[]> {
	const grouped = new Map<string, readonly ParsedFill[]>();

	for (const each of fills) {
		grouped.set(each.slotName, [...(grouped.get(each.slotName) ?? []), each]);
	}

	return grouped;
}

function filledSlotOf(slot: DeclaredSlot, fills: readonly ParsedFill[], rankedIds: readonly string[]): FilledSlot {
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
