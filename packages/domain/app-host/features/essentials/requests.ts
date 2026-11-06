import { z } from "zod";
import { Repeatable, command, refuse } from "@widgetarium/framework";
import { CloseEssentialTabCommand, ReleaseEssentialTabCommand, ShowEssentialTabCommand } from "@widgetarium/places";
import { EssentialsGateway } from "../../gateways/essentials/essentials.gateway.js";
import { PaneFlashGateway } from "../../gateways/pane-flash/pane-flash.gateway.js";
import { ShownViewGateway } from "../../gateways/shown-view/shown-view.gateway.js";
import { StudioWindowGateway } from "../../gateways/studio-window/studio-window.gateway.js";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { essentialsOf, findEssential, moveEssential, removeEssential } from "../../shared/lib/essentials/essentials.js";
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
const TAB_PARTS = {
	studioWindow: StudioWindowGateway,
	essentials: EssentialsGateway,
	shownView: ShownViewGateway,
	paneFlash: PaneFlashGateway,
};

export const ShowEssentialCommand = command("show-essential")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id }, { send, emit, ...parts }) => {
		const essential = findEssential(await keptOf(parts.essentials), id) ?? refuse(NO_ESSENTIAL.replace("{id}", id));
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(ShowEssentialTabCommand, { at, essential: refOf(essential) }),
		);
	});

export const RemoveEssentialCommand = command("remove-essential")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id }, { send, emit, ...parts }) => {
		const kept = await keptOf(parts.essentials);
		const essential = findEssential(kept, id) ?? refuse(NO_ESSENTIAL.replace("{id}", id));
		await releaseEssential(
			{ parts, send, told: () => emit(TabsSettledEvent) },
			{ kept, essential, place: WORKSPACE_END },
		);
	});

export const CloseEssentialCommand = command("close-essential")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(CloseEssentialTabCommand, { at, essentialId: id }),
		);
	});

export const PlaceEssentialCommand = command("place-essential")
	.input(z.object({ id: z.string(), to: TabDropSchema }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id, to }, { send, emit, ...parts }) => {
		const kept = await keptOf(parts.essentials);
		const essential = findEssential(kept, id) ?? refuse(NO_ESSENTIAL.replace("{id}", id));

		if (to.kind === "essentials") {
			saveEssentials(kept, moveEssential(kept, essential, to.at), parts.essentials);
			return;
		}

		if (to.kind === "own-window") {
			return refuse(NO_ESSENTIAL_WINDOW.replace("{id}", id));
		}

		if (to.kind === "split") {
			return refuse(NO_ESSENTIAL_SPLIT.replace("{id}", id));
		}

		const place = { list: to.list, groupId: to.groupId, before: to.before };
		await releaseEssential({ parts, send, told: () => emit(TabsSettledEvent) }, { kept, essential, place });
	});

interface EssentialRelease {
	readonly kept: KeptEssentials;
	readonly essential: Essential;
	readonly place: { readonly list: string; readonly groupId: string | null; readonly before: string | null };
}

async function releaseEssential(
	reach: TabsReach & { readonly parts: { readonly essentials: EssentialsGateway } },
	{ kept, essential, place }: EssentialRelease,
): Promise<void> {
	await settleAsked(reach, (at) => reach.send(ReleaseEssentialTabCommand, { at, essential: refOf(essential), place }));
	saveEssentials(kept, removeEssential(kept, essential), reach.parts.essentials);
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
