import { z } from "zod";
import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import { places } from "@widgetarium/places/contract";
import { EssentialsGateway } from "../../gateways/essentials/essentials.gateway.js";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import {
	essentialsOf,
	findEssential,
	moveEssential,
	moveToRemoveEssential,
} from "../../shared/lib/essentials/essentials.js";
import { saveEssentials, settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import type { TabsReach } from "../../shared/lib/tab-showing/tab-settling.js";
import type { Essential, KeptEssentials } from "../../shared/schema/essential.schema.js";
import { TabDropSchema } from "../../shared/schema/tab-drop.schema.js";

const NO_ESSENTIAL = 'no essential "{id}"';
const NO_ESSENTIAL_SPLIT = 'the essential "{id}" joins a split only as a tab';
const NO_ESSENTIAL_WINDOW = 'the essential "{id}" opens in its own window only as a tab';
const WORKSPACE_END = {
	list: "workspace",
	groupId: null,
	before: null,
};

export const showEssential = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		const essential = findEssential(await keptOf(injects.essentials), id) ?? refuse(NO_ESSENTIAL.replace("{id}", id));
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabOpening.showEssentialTab, { at, essential: refOf(essential) }),
		);
	});

export const removeEssential = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		const kept = await keptOf(injects.essentials);
		const essential = findEssential(kept, id) ?? refuse(NO_ESSENTIAL.replace("{id}", id));
		await releaseEssential({ injects, send, told: () => emit(tabsSettled) }, { kept, essential, place: WORKSPACE_END });
	});

export const closeEssential = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabClosing.closeEssentialTab, { at, essentialId: id }),
		);
	});

export const placeEssential = command()
	.public()
	.input(z.object({ id: z.string(), to: TabDropSchema }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, to }, { send, emit, ...injects }) => {
		const kept = await keptOf(injects.essentials);
		const essential = findEssential(kept, id) ?? refuse(NO_ESSENTIAL.replace("{id}", id));

		if (to.kind === "essentials") {
			saveEssentials(kept, moveEssential(kept, essential, to.at), injects.essentials);
			return;
		}

		if (to.kind === "own-window") {
			return refuse(NO_ESSENTIAL_WINDOW.replace("{id}", id));
		}

		if (to.kind === "split") {
			return refuse(NO_ESSENTIAL_SPLIT.replace("{id}", id));
		}

		const place = { list: to.list, groupId: to.groupId, before: to.before };
		await releaseEssential({ injects, send, told: () => emit(tabsSettled) }, { kept, essential, place });
	});

interface EssentialRelease {
	readonly kept: KeptEssentials;
	readonly essential: Essential;
	readonly place: { readonly list: string; readonly groupId: string | null; readonly before: string | null };
}

async function releaseEssential(
	reach: TabsReach & { readonly injects: { readonly essentials: EssentialsGateway } },
	{ kept, essential, place }: EssentialRelease,
): Promise<void> {
	await settleAsked(reach, (at) =>
		reach.send(places.tabOpening.releaseEssentialTab, { at, essential: refOf(essential), place }),
	);
	saveEssentials(kept, moveToRemoveEssential(kept, essential), reach.injects.essentials);
}

async function keptOf(essentials: EssentialsGateway): Promise<KeptEssentials> {
	await essentials.essentialsLoaded();
	return essentialsOf(essentials.essentials());
}

function refOf({ id, app, address }: Essential): {
	readonly id: string;
	readonly app: Essential["app"];
	readonly address: string | null;
} {
	return {
		id,
		app,
		address,
	};
}
