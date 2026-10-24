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
	openTab,
	openTabAfter,
	renameTab,
	reopenLastClosed,
} from "../../shared/lib/host-tabs/host-tabs.js";
import { WORKSPACE_END, WORKSPACE_LIST } from "../../shared/lib/host-tabs/tab-lists.js";
import { withGroupClosed, withTabsClosed } from "../../shared/lib/tab-showing/closing.js";
import {
	shownAppOf,
	shownTabIdOf,
	withEffect,
	withMoved,
	withPageEnsured,
} from "../../shared/lib/tab-showing/showing.js";
import type { Showing } from "../../shared/lib/tab-showing/showing.js";
import type { TabFacts } from "../../shared/lib/tab-showing/tab-facts.js";
import { tabPageOf } from "../../shared/lib/tab-showing/tab-pages.js";
import {
	EFFECT_COMMANDS,
	FACT_QUERIES,
	NOT_HELD,
	NO_OWN_WINDOW,
	factsOf,
	freshTabOf,
	settle,
	tabsNowOf,
	withOpenedTabShown,
} from "../../shared/lib/tab-showing/tab-settling.js";
import { AppKindSchema } from "../../shared/schema/app-tab.schema.js";

const NOT_LISTED = 'the tab "{id}" stands in no list';
const NO_PAGE = 'the tab "{id}" shows no browser page';
const NOTHING_CLOSED = "no closed tab is left to reopen";
const NOTHING_SHOWN = "no tab is shown";
const NO_GROUP = 'no group "{id}"';
const TAB_PARTS = {
	hostTabs: HostTabsGateway,
	essentials: EssentialsGateway,
	shownView: ShownViewGateway,
	paneFlash: PaneFlashGateway,
};

export const OpenTabCommand = command("open-tab")
	.input(z.object({ app: AppKindSchema }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
	.handle(async ({ app }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const opened = openTab(showing.moment, freshTabOf(app, facts), WORKSPACE_END);
		return settle(showing, withOpenedTabShown(withMoved(showing, opened), facts, opened.tab, ""), { parts, send });
	});

export const OpenTabBelowCommand = command("open-tab-below")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
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
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const source = heldTabOf(showing.moment, id);

		if (!source) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		const address = tabPageOf(showing.moment, facts.pages, id)?.address ?? "";
		const opened = openTabAfter(showing.moment, id, freshTabOf(source.app, facts));

		if (opened === null) {
			return refuse(NOT_LISTED.replace("{id}", id));
		}

		return settle(showing, withOpenedTabShown(withMoved(showing, opened), facts, opened.tab, address), { parts, send });
	});

export const ReloadTabCommand = command("reload-tab")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
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
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
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
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
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
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
	.handle(async (_input, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const reopened = withLastClosedReopened(showing, facts);

		if (reopened === null) {
			return refuse(NOTHING_CLOSED);
		}

		return settle(showing, reopened, { parts, send });
	});

export const CloseTabCommand = command("close-tab")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
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
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
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
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
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

		return settle(showing, withEffect(ensured.showing, { kind: "tear-off-page", pageId: ensured.pageId }), {
			parts,
			send,
		});
	});

export const CloseGroupCommand = command("close-group")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.sends(...FACT_QUERIES, ...EFFECT_COMMANDS)
	.handle(async ({ id }, { send, ...parts }) => {
		const facts = await factsOf(parts, send);
		const { showing } = tabsNowOf(parts, facts);
		const group = findGroup(showing.moment.groups, id);

		if (!group) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		return settle(showing, withGroupClosed(showing, facts, group), { parts, send });
	});

function withLastClosedReopened(showing: Showing, facts: TabFacts): Showing | null {
	const reopened = reopenLastClosed(showing.moment, facts.chat.id);
	return reopened === null
		? null
		: withOpenedTabShown(withMoved(showing, reopened), facts, reopened.closed.tab, reopened.closed.address);
}
