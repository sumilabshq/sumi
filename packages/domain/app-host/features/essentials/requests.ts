import { z } from "zod";
import { Repeatable, command, refuse } from "@widgetarium/core/requests";
import { EssentialsGateway } from "../../gateways/essentials/essentials.gateway.js";
import { HostTabsGateway } from "../../gateways/host-tabs/host-tabs.gateway.js";
import { PaneFlashGateway } from "../../gateways/pane-flash/pane-flash.gateway.js";
import { ShownViewGateway } from "../../gateways/shown-view/shown-view.gateway.js";
import { findEssential, moveEssential, removeEssential } from "../../shared/lib/essentials/essentials.js";
import { openEssentialTab, openTab, placeTab } from "../../shared/lib/host-tabs/host-tabs.js";
import { WORKSPACE_END, listPlaceOf } from "../../shared/lib/host-tabs/tab-lists.js";
import type { TabPlace } from "../../shared/lib/host-tabs/tab-lists.js";
import { withTabsClosed } from "../../shared/lib/tab-showing/closing.js";
import { withMoved, withTabShown } from "../../shared/lib/tab-showing/showing.js";
import type { Showing } from "../../shared/lib/tab-showing/showing.js";
import type { TabFacts } from "../../shared/lib/tab-showing/tab-facts.js";
import {
	factsOf,
	freshTabOf,
	liveTabOf,
	saveEssentials,
	settle,
	tabsNowOf,
	withOpenedTabShown,
} from "../../shared/lib/tab-showing/tab-settling.js";
import type { Essential } from "../../shared/schema/essential.schema.js";
import { TabDropSchema } from "../../shared/schema/tab-drop.schema.js";

const NO_ESSENTIAL = 'no essential "{id}"';
const NO_ESSENTIAL_WINDOW = 'the essential "{id}" opens in its own window only as a tab';
const NOT_OPEN = 'the essential "{id}" is not open';
const TAB_PARTS = {
	hostTabs: HostTabsGateway,
	essentials: EssentialsGateway,
	shownView: ShownViewGateway,
	paneFlash: PaneFlashGateway,
};

export const ShowEssentialCommand = command("show-essential")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing, kept } = tabsNowOf(parts, facts);
		const essential = findEssential(kept, id);

		if (!essential) {
			return refuse(NO_ESSENTIAL.replace("{id}", id));
		}

		const live = liveTabOf(showing.moment, id);

		if (live) {
			return settle(showing, withTabShown(showing, facts, live), { parts, send });
		}

		const opened = openEssentialTab(showing.moment, id, freshTabOf(essential.app, facts));
		const shown = withOpenedTabShown(withMoved(showing, opened), facts, opened.tab, essential.address ?? "");
		return settle(showing, shown, { parts, send });
	});

export const RemoveEssentialCommand = command("remove-essential")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing, kept } = tabsNowOf(parts, facts);
		const essential = findEssential(kept, id);

		if (!essential) {
			return refuse(NO_ESSENTIAL.replace("{id}", id));
		}

		saveEssentials(kept, removeEssential(kept, essential), parts.essentials);
		return settle(showing, withEssentialReleased(showing, facts, essential, WORKSPACE_END), { parts, send });
	});

export const CloseEssentialCommand = command("close-essential")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const live = liveTabOf(showing.moment, id);

		if (!live) {
			return refuse(NOT_OPEN.replace("{id}", id));
		}

		return settle(showing, withTabsClosed(showing, facts, { ids: [live.id], reason: `close essential ${id}` }), {
			parts,
			send,
		});
	});

export const PlaceEssentialCommand = command("place-essential")
	.input(z.object({ id: z.string(), to: TabDropSchema }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id, to }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing, kept } = tabsNowOf(parts, facts);
		const essential = findEssential(kept, id);

		if (!essential) {
			return refuse(NO_ESSENTIAL.replace("{id}", id));
		}

		if (to.kind === "essentials") {
			saveEssentials(kept, moveEssential(kept, essential, to.at), parts.essentials);
			return undefined;
		}

		if (to.kind === "own-window") {
			return refuse(NO_ESSENTIAL_WINDOW.replace("{id}", id));
		}

		saveEssentials(kept, removeEssential(kept, essential), parts.essentials);
		return settle(showing, withEssentialReleased(showing, facts, essential, listPlaceOf(to)), { parts, send });
	});

function withEssentialReleased(showing: Showing, facts: TabFacts, essential: Essential, place: TabPlace): Showing {
	const live = liveTabOf(showing.moment, essential.id);

	if (live) {
		return withMoved(showing, placeTab(showing.moment, live.id, place));
	}

	const opened = openTab(showing.moment, freshTabOf(essential.app, facts), place);
	return withOpenedTabShown(withMoved(showing, opened), facts, opened.tab, essential.address ?? "");
}
