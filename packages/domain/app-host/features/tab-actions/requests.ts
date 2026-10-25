import { z } from "zod";
import { Repeatable, command, refuse } from "@widgetarium/core/requests";
import { EssentialsGateway } from "../../gateways/essentials/essentials.gateway.js";
import { HostTabsGateway } from "../../gateways/host-tabs/host-tabs.gateway.js";
import { PaneFlashGateway } from "../../gateways/pane-flash/pane-flash.gateway.js";
import { ShownViewGateway } from "../../gateways/shown-view/shown-view.gateway.js";
import {
	chatOfTab,
	findGroup,
	flatTabIdsOf,
	heldTabOf,
	newTabPlaceOf,
	openTab,
	openTabAfter,
	openTabUnshown,
	renameTab,
} from "../../shared/lib/host-tabs/host-tabs.js";
import type {
	HostTab,
	HostTabsMoment,
	OpenedHostTab,
	OpenedTab,
	TabPlace,
} from "../../shared/lib/host-tabs/host-tabs.js";
import { chatOfGroup, placeAfterOf } from "../../shared/lib/host-tabs/tab-lists.js";
import { withClosedReopened } from "../../shared/lib/tab-showing/reopening.js";
import { WORKSPACE_LIST, isKnownList } from "../../shared/lib/host-tabs/tab-lists.js";
import { withGroupClosed, withTabsClosed } from "../../shared/lib/tab-showing/closing.js";
import {
	shownAppOf,
	shownTabIdOf,
	withEffect,
	withMoved,
	withPageEnsured,
	withTabPageOpened,
	withTabTornOff,
} from "../../shared/lib/tab-showing/showing.js";
import type { Showing } from "../../shared/lib/tab-showing/showing.js";
import type { TabFacts } from "../../shared/lib/tab-showing/tab-facts.js";
import { tabPageOf } from "../../shared/lib/tab-showing/tab-pages.js";
import {
	NOT_HELD,
	NO_OWN_WINDOW,
	factsOf,
	freshTabOf,
	settle,
	tabsNowOf,
	withOpenedTabShown,
} from "../../shared/lib/tab-showing/tab-settling.js";
import type { TabsReach } from "../../shared/lib/tab-showing/tab-settling.js";
import { AppKindSchema, OpenedTabSchema } from "../../shared/schema/app-tab.schema.js";

const NOT_LISTED = 'the tab "{id}" stands in no list';
const NO_PAGE = 'the tab "{id}" shows no browser page';
const NOTHING_CLOSED = "no closed tab is left to reopen";
const NOTHING_SHOWN = "no tab is shown";
const NO_LIST = 'a new tab cannot go to "{list}": no such tab list here';
const NO_GROUP = 'no group "{id}"';
const GROUP_ELSEWHERE = 'the group "{id}" stands in "{home}", not in "{list}"';

interface AskedPlace {
	readonly list: string | null;
	readonly groupId: string | null;
}

interface TabOpening {
	readonly address: string;
	readonly show: boolean;
}

interface TabToOpen extends TabOpening {
	readonly app: OpenedTab["app"];
	readonly place: TabPlace;
}

interface ShowingNow {
	readonly showing: Showing;
	readonly facts: TabFacts;
}
const TAB_PARTS = {
	hostTabs: HostTabsGateway,
	essentials: EssentialsGateway,
	shownView: ShownViewGateway,
	paneFlash: PaneFlashGateway,
};

export const OpenTabCommand = command("open-tab")
	.input(
		z.object({
			app: AppKindSchema,
			list: z.string().nullable().default(null),
			groupId: z.string().nullable().default(null),
			address: z.string().default(""),
			show: z.boolean().default(true),
		}),
	)
	.output(OpenedTabSchema)
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async (asked, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const place = askedPlaceOf(showing.moment, asked, facts.chatGroupIds);

		if (typeof place === "string") {
			return refuse(place);
		}

		return openAndSettle({ showing, facts }, { ...asked, place }, { parts, send });
	});

export const OpenTabBelowCommand = command("open-tab-below")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);

		if (!heldTabOf(showing.moment, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const opened = openTabAfter(showing.moment, id, freshTabOf("browser", facts));

		if (opened === null) {
			return refuse(NOT_LISTED.replace("{id}", id));
		}

		return settle(showing, withOpenedTabShown(withMoved(showing, opened), facts, opened.tab, ""), { parts, send });
	});

export const DuplicateTabCommand = command("duplicate-tab")
	.input(
		z.object({
			id: z.string(),
			list: z.string().nullable().default(null),
			groupId: z.string().nullable().default(null),
			show: z.boolean().default(true),
		}),
	)
	.output(OpenedTabSchema)
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async (asked, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const source = heldTabOf(showing.moment, asked.id);

		if (!source) {
			return refuse(NOT_HELD.replace("{id}", asked.id));
		}

		const place = duplicatePlaceOf(showing.moment, asked, facts.chatGroupIds);

		if (typeof place === "string") {
			return refuse(place);
		}

		const address = tabPageOf(showing.moment, facts.pages, asked.id)?.address ?? "";
		return openAndSettle({ showing, facts }, { app: source.app, place, address, show: asked.show }, { parts, send });
	});

export const ReloadTabCommand = command("reload-tab")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const page = tabPageOf(showing.moment, facts.pages, id);

		if (!page) {
			return refuse(NO_PAGE.replace("{id}", id));
		}

		return settle(showing, withEffect(showing, { kind: "reload-page", pageId: page.pageId }), { parts, send });
	});

export const RenameTabCommand = command("rename-tab")
	.input(z.object({ id: z.string(), label: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id, label }, { send, ...parts }) => {
		const { showing } = tabsNowOf(parts, await factsOf(parts, send));

		if (!heldTabOf(showing.moment, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		return settle(showing, withMoved(showing, renameTab(showing.moment, id, label)), { parts, send });
	});

export const CloseOtherTabsCommand = command("close-other-tabs")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);

		if (!heldTabOf(showing.moment, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const listId = chatOfTab(showing.moment, id) ?? WORKSPACE_LIST;
		const others = flatTabIdsOf(showing.moment, listId).filter((other) => other !== id);
		const reason = `close ${others.length} tabs beside ${id}`;
		return settle(showing, withTabsClosed(showing, facts, { ids: others, reason }), { parts, send });
	});

export const ReopenClosedTabCommand = command("reopen-closed-tab")
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async (_input, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const reopened = withClosedReopened(showing, facts, showing.moment.closed.at(-1)?.tab.id ?? "");

		if (reopened === null) {
			return refuse(NOTHING_CLOSED);
		}

		return settle(showing, reopened, { parts, send });
	});

export const CloseTabCommand = command("close-tab")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);

		if (!heldTabOf(showing.moment, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		return settle(showing, withTabsClosed(showing, facts, { ids: [id], reason: `close ${id}` }), { parts, send });
	});

export const CloseShownTabCommand = command("close-shown-tab")
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async (_input, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const shownId = shownTabIdOf(showing.moment, shownAppOf(showing.shownView));

		if (shownId === null) {
			return refuse(NOTHING_SHOWN);
		}

		return settle(showing, withTabsClosed(showing, facts, { ids: [shownId], reason: `close the shown ${shownId}` }), {
			parts,
			send,
		});
	});

export const TearOffTabCommand = command("tear-off-tab")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);

		if (!heldTabOf(showing.moment, id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const ensured = withPageEnsured(showing, facts, { tabId: id, why: "dragged toward its own window" });

		if (ensured.pageId === null) {
			return refuse(NO_OWN_WINDOW.replace("{id}", id));
		}

		const tornOff = withEffect(ensured.showing, { kind: "tear-off-page", pageId: ensured.pageId, tabId: id });
		return settle(showing, withTabTornOff(tornOff, facts, id), {
			parts,
			send,
		});
	});

export const CloseGroupCommand = command("close-group")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const group = findGroup(showing.moment.groups, id);

		if (!group) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		return settle(showing, withGroupClosed(showing, facts, group), { parts, send });
	});

function askedPlaceOf(
	moment: HostTabsMoment,
	{ list, groupId }: AskedPlace,
	chatIds: readonly string[],
): TabPlace | string {
	if (groupId !== null) {
		return groupPlaceOf(moment, groupId, list);
	}

	if (list !== null && !isKnownList(moment, list, chatIds)) {
		return NO_LIST.replace("{list}", list);
	}

	return newTabPlaceOf(moment, list);
}

function duplicatePlaceOf(
	moment: HostTabsMoment,
	asked: AskedPlace & { readonly id: string },
	chatIds: readonly string[],
): TabPlace | string {
	if (asked.list !== null || asked.groupId !== null) {
		return askedPlaceOf(moment, asked, chatIds);
	}

	return placeAfterOf(moment, asked.id) ?? NOT_LISTED.replace("{id}", asked.id);
}

function groupPlaceOf(moment: HostTabsMoment, groupId: string, list: string | null): TabPlace | string {
	const home = chatOfGroup(moment, groupId);

	if (home === null) {
		return NO_GROUP.replace("{id}", groupId);
	}

	if (list !== null && list !== home) {
		return GROUP_ELSEWHERE.replace("{id}", groupId).replace("{home}", home).replace("{list}", list);
	}

	return {
		chatId: home,
		groupId,
		before: null,
	};
}

async function openAndSettle(
	{ showing, facts }: ShowingNow,
	asked: TabToOpen,
	reach: TabsReach,
): Promise<{ id: string }> {
	const opened = openAskedTab(showing.moment, freshTabOf(asked.app, facts), asked);
	await settle(showing, withOpenedShowing(withMoved(showing, opened), facts, opened.tab, asked), reach);
	return { id: opened.tab.id };
}

function openAskedTab(
	moment: HostTabsMoment,
	opened: OpenedTab,
	{ place, show }: { readonly place: TabPlace; readonly show: boolean },
): OpenedHostTab {
	return show ? openTab(moment, opened, place) : openTabUnshown(moment, opened, place);
}

function withOpenedShowing(showing: Showing, facts: TabFacts, tab: HostTab, { address, show }: TabOpening): Showing {
	return show
		? withOpenedTabShown(showing, facts, tab, address)
		: withTabPageOpened(showing, tab, { address, isShown: false });
}
