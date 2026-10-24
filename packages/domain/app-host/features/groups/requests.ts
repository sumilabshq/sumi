import { z } from "zod";
import { Repeatable, command, refuse } from "@widgetarium/core/requests";
import type { Send } from "@widgetarium/core/requests";
import { ActiveChatQuery } from "@widgetarium/workspaces";
import { HostTabsGateway } from "../../gateways/host-tabs/host-tabs.gateway.js";
import { addGroup, changeGroup, chatOfTab, findGroup, ungroup } from "../../shared/lib/host-tabs/host-tabs.js";
import type { HostTabsMoment, MovedTabs } from "../../shared/lib/host-tabs/host-tabs.js";
import { keptTabsOf, momentOf, tabsTransitionSaid } from "../../shared/lib/host-tabs/kept-tabs.js";
import { isKnownList } from "../../shared/lib/host-tabs/tab-lists.js";
import { GroupHueSchema } from "../../shared/schema/tab-group.schema.js";

const NO_GROUP = 'no group "{id}"';
const NOT_LISTED = 'the tab "{id}" stands in no list';
const UNKNOWN_LIST = 'no tab list "{list}" is on screen';
const NAMELESS = "a group needs a name";

interface GroupBirth {
	readonly listId: string;
	readonly withTabId: string | null;
}

export const CreateGroupCommand = command("create-group")
	.input(z.union([z.object({ withTabId: z.string() }), z.object({ list: z.string() })]))
	.output(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject({ hostTabs: HostTabsGateway })
	.handle(async (asked, { hostTabs, send }) => {
		const chatId = await loadedChatIdOf(hostTabs, send);
		const moment = momentOf(hostTabs.tabs(), chatId);

		if ("list" in asked && !isKnownList(moment, asked.list, chatId)) {
			return refuse(UNKNOWN_LIST.replace("{list}", asked.list));
		}

		if ("list" in asked) {
			return { id: saveNewGroup(hostTabs, moment, { listId: asked.list, withTabId: null }) };
		}

		const listId = chatOfTab(moment, asked.withTabId);

		if (listId === null) {
			return refuse(NOT_LISTED.replace("{id}", asked.withTabId));
		}

		return { id: saveNewGroup(hostTabs, moment, { listId, withTabId: asked.withTabId }) };
	});

export const RenameGroupCommand = command("rename-group")
	.input(z.object({ id: z.string(), name: z.string() }))
	.idempotencyKey(Repeatable)
	.inject({ hostTabs: HostTabsGateway })
	.handle(async ({ id, name }, { hostTabs, send }) => {
		const chatId = await loadedChatIdOf(hostTabs, send);
		const moment = momentOf(hostTabs.tabs(), chatId);
		const group = findGroup(moment.groups, id);

		if (!group) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		if (name.trim() === "") {
			return refuse(NAMELESS);
		}

		saveTabs(hostTabs, moment, changeGroup(moment, group, { name: name.trim() }));
		return undefined;
	});

export const SetGroupHueCommand = command("set-group-hue")
	.input(z.object({ id: z.string(), hue: GroupHueSchema.nullable() }))
	.idempotencyKey(Repeatable)
	.inject({ hostTabs: HostTabsGateway })
	.handle(async ({ id, hue }, { hostTabs, send }) => {
		const chatId = await loadedChatIdOf(hostTabs, send);
		const moment = momentOf(hostTabs.tabs(), chatId);
		const group = findGroup(moment.groups, id);

		if (!group) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		saveTabs(hostTabs, moment, changeGroup(moment, group, { hue }));
		return undefined;
	});

export const FoldGroupCommand = command("fold-group")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject({ hostTabs: HostTabsGateway })
	.handle(async ({ id }, { hostTabs, send }) => {
		const chatId = await loadedChatIdOf(hostTabs, send);
		const moment = momentOf(hostTabs.tabs(), chatId);
		const group = findGroup(moment.groups, id);

		if (!group) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		saveTabs(hostTabs, moment, changeGroup(moment, group, { isOpen: !group.isOpen }));
		return undefined;
	});

export const UngroupCommand = command("ungroup")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject({ hostTabs: HostTabsGateway })
	.handle(async ({ id }, { hostTabs, send }) => {
		const chatId = await loadedChatIdOf(hostTabs, send);
		const moment = momentOf(hostTabs.tabs(), chatId);
		const group = findGroup(moment.groups, id);

		if (!group) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		saveTabs(hostTabs, moment, ungroup(moment, group));
		return undefined;
	});

async function loadedChatIdOf(hostTabs: HostTabsGateway, send: Send): Promise<string> {
	const [chat] = await Promise.all([send(ActiveChatQuery), hostTabs.tabsLoaded()]);
	return chat.id;
}

function saveNewGroup(hostTabs: HostTabsGateway, moment: HostTabsMoment, { listId, withTabId }: GroupBirth): string {
	const added = addGroup(moment, listId, withTabId);
	saveTabs(hostTabs, moment, added);
	return added.groupId;
}

function saveTabs(hostTabs: HostTabsGateway, was: HostTabsMoment, moved: MovedTabs | null): void {
	if (moved === null) {
		return;
	}

	hostTabs.saveTabs(keptTabsOf(moved.moment), moved.reason);
	console.info(`[widgetarium] ${tabsTransitionSaid(was, moved.moment, moved.reason)}`);
}
