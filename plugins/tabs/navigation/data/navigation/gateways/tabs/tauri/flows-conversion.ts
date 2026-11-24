import { z } from "zod";
import type { HeldDoc, StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { PlacedApp } from "../../../shared/host/places.host.js";
import { flowsConversionMove, folderColorsFillMove } from "../../../shared/lib/flows/flow-moves.js";
import { placedAppsOf } from "../../../shared/lib/tabs/app-abilities.js";
import { commitPlaces } from "./kept-places.js";
import type { KeptNavigation } from "./kept-places.js";

export interface FlowsConversionFacts {
	readonly store: StoreClient;
	readonly workspaceId: string;
	readonly isOn: boolean;
	readonly apps: readonly PlacedApp[];
}

const RefusalSchema = z.string().nullable();

const SKIPPED = "[widgetarium] navigation flows conversion skipped: {why}";
const REFUSED = "[widgetarium] navigation flows conversion refused, nothing written: {why}";
const FLOWS_KEPT = "the doc already holds flows";
const COLORS_UNFILLED = "[widgetarium] navigation folder colors not filled: {why}";
const GUARD_UNANSWERED = "the store did not answer the conversion guard ({failure})";

export async function flowsConverted(
	kept: HeldDoc<KeptNavigation>,
	facts: FlowsConversionFacts,
): Promise<HeldDoc<KeptNavigation>> {
	if (!facts.isOn) {
		return kept;
	}

	const refusal = await guardRefusalOf(facts);

	if (refusal !== null) {
		console.warn(SKIPPED.replace("{why}", refusal));
		return kept;
	}

	if (kept.now().flows !== undefined) {
		console.info(SKIPPED.replace("{why}", FLOWS_KEPT));
		return commitColorsFill(kept);
	}

	return commitConversion(kept, facts);
}

async function commitConversion(
	kept: HeldDoc<KeptNavigation>,
	facts: FlowsConversionFacts,
): Promise<HeldDoc<KeptNavigation>> {
	try {
		const moment = { apps: placedAppsOf(facts.apps), sourceRev: kept.rev(), now: Date.now() };
		const answer = await commitPlaces(kept, flowsConversionMove(moment));

		if (answer.isRefused) {
			console.error(REFUSED.replace("{why}", answer.reasons.join("; ")));
			return kept;
		}

		for (const said of answer.said) {
			console.info(`[widgetarium] navigation ${said}`);
		}
	} catch (failure: unknown) {
		console.error(REFUSED.replace("{why}", String(failure)), failure);
	}

	return kept;
}

async function commitColorsFill(kept: HeldDoc<KeptNavigation>): Promise<HeldDoc<KeptNavigation>> {
	try {
		for (const said of await commitPlaces(kept, folderColorsFillMove())) {
			console.info(`[widgetarium] navigation ${said}`);
		}
	} catch (failure: unknown) {
		console.error(COLORS_UNFILLED.replace("{why}", String(failure)), failure);
	}

	return kept;
}

async function guardRefusalOf({ store, workspaceId }: FlowsConversionFacts): Promise<string | null> {
	try {
		return RefusalSchema.parse(await store.call("conversion_refusal", { id: workspaceId }));
	} catch (failure: unknown) {
		return GUARD_UNANSWERED.replace("{failure}", String(failure));
	}
}
