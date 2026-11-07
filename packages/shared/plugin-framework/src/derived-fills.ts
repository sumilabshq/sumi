import { createFill } from "./declared-slot";
import type { DerivedFill, Fill } from "./fill";
import { filledSlotOf, fillOutcomeOf, isParsedFill } from "./fill-outcome";
import type { FillOutcome, ParsedFill, ResolvedOwnership, ShownFill } from "./fill-outcome";
import { stampSlotName } from "./plugin";
import type { Plugin } from "./plugin";
import { sentenceOf } from "./sentence";

export interface FillResolution {
	readonly ownership: ResolvedOwnership;
	readonly startedIds: ReadonlySet<string>;
	readonly rankedIds: readonly string[];
}

interface DerivedOffer {
	readonly filler: Plugin;
	readonly fill: DerivedFill;
}

const SOURCE_NOT_OWN =
	"plugin {plugin} derives fills of slot {slot} from slot {source}, which it does not declare: a plugin derives only from its own slots";
const DERIVE_LOOP =
	"plugin {plugin} derives fills of slot {slot} from slot {source}, which waits on those fills: a loop";
const DERIVE_FAILED = "plugin {plugin} derives fills of slot {slot} from slot {source}, and that failed: {reason}";
const DERIVE_NOT_LIST =
	"plugin {plugin} derives fills of slot {slot} from slot {source}, and answered something that is not a list";

export function derivedOutcomesOf(
	started: readonly Plugin[],
	plainFills: readonly ParsedFill[],
	resolution: FillResolution,
): readonly FillOutcome[] {
	const offers = derivedOffersOf(started);
	const ownsSource = ({ filler, fill }: DerivedOffer): boolean =>
		resolution.ownership.bySlot.get(fill.source)?.ownerId === filler.id;
	const foreignSources = offers
		.filter((offer) => !ownsSource(offer))
		.map((offer) => ({ refusal: derivedRefusalOf(SOURCE_NOT_OWN, offer, resolution.ownership) }));

	return [...foreignSources, ...outcomesInWavesOf(offers.filter(ownsSource), plainFills, resolution)];
}

function outcomesInWavesOf(
	offers: readonly DerivedOffer[],
	plainFills: readonly ParsedFill[],
	resolution: FillResolution,
): readonly FillOutcome[] {
	const outcomes: FillOutcome[] = [];
	let pending = offers;

	for (let ready = readyOffersOf(pending); ready.length > 0; ready = readyOffersOf(pending)) {
		const parsed = [...plainFills, ...outcomes.filter(isParsedFill)];
		outcomes.push(...ready.flatMap((offer) => outcomesOfOffer(offer, parsed, resolution)));
		pending = pending.filter((offer) => !ready.includes(offer));
	}

	return [...outcomes, ...loopRefusalsOf(pending, resolution.ownership)];
}

function loopRefusalsOf(pending: readonly DerivedOffer[], ownership: ResolvedOwnership): readonly FillOutcome[] {
	return pending.map((offer) => ({ refusal: derivedRefusalOf(DERIVE_LOOP, offer, ownership) }));
}

function derivedOffersOf(started: readonly Plugin[]): readonly DerivedOffer[] {
	return started.flatMap((filler) =>
		filler.parts.derivedFills.map((fill) => ({
			filler,
			fill,
		})),
	);
}

function readyOffersOf(pending: readonly DerivedOffer[]): readonly DerivedOffer[] {
	return pending.filter((offer) => !pending.some((other) => other.fill.slot === offer.fill.source));
}

function outcomesOfOffer(
	offer: DerivedOffer,
	parsed: readonly ParsedFill[],
	resolution: FillResolution,
): readonly FillOutcome[] {
	const answer = answerOf(offer, sourceItemsOf(offer, parsed, resolution.rankedIds));

	if ("reason" in answer) {
		return [{ refusal: derivedRefusalOf(DERIVE_FAILED, offer, resolution.ownership, answer.reason) }];
	}

	if (!Array.isArray(answer.answered)) {
		return [{ refusal: derivedRefusalOf(DERIVE_NOT_LIST, offer, resolution.ownership) }];
	}

	return answer.answered.map((input: unknown) => outcomeOfDerivedInput(offer, input, resolution));
}

function sourceItemsOf(
	offer: DerivedOffer,
	parsed: readonly ParsedFill[],
	rankedIds: readonly string[],
): readonly unknown[] {
	const sourceName = stampSlotName(offer.filler.id, offer.fill.source);
	const sourceFills = parsed.filter(({ stampedName }) => stampedName === sourceName);
	return filledSlotOf(offer.fill.source, sourceFills, rankedIds).fills.map(withId);
}

function answerOf(
	offer: DerivedOffer,
	items: readonly unknown[],
): { readonly answered: unknown } | { readonly reason: string } {
	try {
		return { answered: offer.fill.derivation.derive(items) };
	} catch (error) {
		return { reason: reasonOf(error) };
	}
}

function outcomeOfDerivedInput(offer: DerivedOffer, input: unknown, resolution: FillResolution): FillOutcome {
	let derived: Fill;

	try {
		derived = createFill(offer.fill.slot, input);
	} catch (error) {
		return { refusal: derivedRefusalOf(DERIVE_FAILED, offer, resolution.ownership, reasonOf(error)) };
	}

	return fillOutcomeOf({ filler: offer.filler, fill: derived }, resolution.ownership.bySlot, resolution.startedIds);
}

function withId({ id, item }: ShownFill): unknown {
	if (typeof item !== "object" || item === null) {
		return item;
	}

	return {
		...item,
		id,
	};
}

function derivedRefusalOf(
	template: string,
	{ filler, fill }: DerivedOffer,
	ownership: ResolvedOwnership,
	reason = "",
): string {
	return sentenceOf(template, {
		plugin: filler.id,
		slot: ownership.bySlot.get(fill.slot)?.stampedName ?? fill.slot.name,
		source: ownership.bySlot.get(fill.source)?.stampedName ?? fill.source.name,
		reason,
	});
}

function reasonOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
