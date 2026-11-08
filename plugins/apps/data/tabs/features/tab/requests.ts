import { AuthenticatedGuard, PerCall, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import { appHost } from "@widgetarium/app-host/contract";
import { apps } from "@sumi/apps/contract";
import {
	ClosedTabSchema,
	PlacedTabSchema,
	TabDuplicateSchema,
	TabIdSchema,
	TabNowSchema,
	TabOpenSchema,
	TabUpdateSchema,
} from "../../shared/schema/tab-asks.schema.js";
import { listOfPlace, ownTabOf, refuseMissingTab, refusePlace, refuseTab } from "../../shared/lib/tab-places.js";
import {
	duplicatedTabIn,
	openedTabIn,
	placedTabOf,
	refuseApp,
	refuseNewPlace,
	refuseTwoGroups,
} from "./lib/tab-placing.js";
import { moveTab, renameTab, tabNowOf } from "./lib/tab-change.js";
import { openableAppsOf } from "../../shared/lib/openable-apps.js";

export const open = command()
	.public()
	.metadata({
		description:
			"Open a tab in an app. app is always required: an id from tabs_apps_all. target is the place inside that app and may be left out to open the app's home: app tasks with target T-12 opens task T-12, app tasks alone opens the task board, app browser with target an address or search words opens that page. Opens hidden in this chat unless show is true; link the result as [title](sumi://tab/ID), or a task as [title](sumi://task/T-12).",
	})
	.input(TabOpenSchema)
	.output(PlacedTabSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) => {
		const known = openableAppsOf((await send(apps.apps.all)).apps).map(({ id }) => id);
		const refusal = refuseApp(asked.app, known) ?? refuseTwoGroups(asked) ?? refusePlace(asked.place, user.id);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const list = listOfPlace(asked.place, user.id);
		const openedId = await openedTabIn(send, list, asked);
		console.info(`[widgetarium] tab none → ${openedId} (${asked.app} opened in ${list} by chat ${user.id})`);
		return placedTabOf(openedId, asked);
	});

export const duplicate = command()
	.public()
	.metadata({
		description: "Copy any tab, another chat's included, into a place and group.",
	})
	.input(TabDuplicateSchema)
	.output(PlacedTabSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) => {
		const sidebar = await send(appHost.tabs.tabsSidebar);
		const refusal =
			refuseMissingTab(sidebar, asked.tabId) ?? refuseTwoGroups(asked) ?? refusePlace(asked.place, user.id);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const list = listOfPlace(asked.place, user.id);
		const copyId = await duplicatedTabIn(send, list, asked);
		console.info(`[widgetarium] tab ${asked.tabId} → copy ${copyId} in ${list} (chat ${user.id})`);
		return placedTabOf(copyId, asked);
	});

export const update = command()
	.public()
	.metadata({
		description: "Rename a tab or move it to another place, group or position. Only this chat's and Recents' tabs.",
	})
	.input(TabUpdateSchema)
	.output(TabNowSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) => {
		const spot = ownTabOf(await send(appHost.tabs.tabsSidebar), asked.tabId, user.id);

		if (typeof spot === "string") {
			return refuse(spot);
		}

		const placeRefusal = refuseNewPlace(asked.place, user.id);

		if (placeRefusal !== null) {
			return refuse(placeRefusal);
		}

		const change = { send, chatId: user.id, spot };
		await renameTab(change, asked.title);
		await moveTab(change, asked);
		return tabNowOf(await send(appHost.tabs.tabsSidebar), change);
	});

export const close = command()
	.public()
	.metadata({
		description: "Close a tab. Only this chat's and Recents' tabs.",
	})
	.input(TabIdSchema)
	.output(ClosedTabSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ tabId }, { send, user }) => {
		const refusal = refuseTab(await send(appHost.tabs.tabsSidebar), tabId, user.id);

		if (refusal !== null) {
			return refuse(refusal);
		}

		await send(appHost.tabActions.closeTab, { id: tabId });
		console.info(`[widgetarium] tab ${tabId} open → closed (chat ${user.id})`);
		return { closed: tabId };
	});
