import { AuthenticatedGuard, PerCall, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import { appHost } from "@widgetarium/app-host/contract";
import {
	CreatedGroupSchema,
	EditedGroupSchema,
	GroupCreateSchema,
	GroupEditSchema,
	GroupRemoveSchema,
	RemovedGroupSchema,
} from "../../shared/schema/group-asks.schema.js";
import { OPEN_LIST, placeTabs, refuseGroup } from "../../shared/lib/tab-places.js";
import { refuseNewGroup } from "./lib/new-group.js";

export const create = command()
	.public()
	.metadata({
		description: "Create a tab group, optionally moving tabs into it.",
	})
	.input(GroupCreateSchema)
	.output(CreatedGroupSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) => {
		const refusal = refuseNewGroup(await send(appHost.tabs.tabsSidebar), asked);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const list = OPEN_LIST;
		const created = await send(appHost.groups.create, { list, name: asked.name, hue: asked.colour ?? null });
		await placeTabs(send, asked.tabIds, { list, groupId: created.id, before: null });
		console.info(
			`[widgetarium] group none → ${created.id} "${asked.name}" in ${list} with ${asked.tabIds.length} tabs (chat ${user.id})`,
		);
		return { ...asked, id: created.id };
	});

export const edit = command()
	.public()
	.metadata({
		description: "Rename or recolour a tab group.",
	})
	.input(GroupEditSchema)
	.output(EditedGroupSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ groupId, name, colour }, { send, user }) => {
		const refusal = refuseGroup(await send(appHost.tabs.tabsSidebar), groupId);

		if (refusal !== null) {
			return refuse(refusal);
		}

		if (name !== undefined) {
			await send(appHost.groups.renameGroup, { id: groupId, name });
			console.info(`[widgetarium] group ${groupId} name → ${name} (chat ${user.id})`);
		}

		if (colour !== undefined) {
			await send(appHost.groups.setHue, { id: groupId, hue: colour });
			console.info(`[widgetarium] group ${groupId} colour → ${colour ?? "none"} (chat ${user.id})`);
		}

		return { updated: groupId };
	});

export const remove = command()
	.public()
	.metadata({
		description: "Delete a tab group. keepTabs (default true) leaves its tabs in the list; false closes them too.",
	})
	.input(GroupRemoveSchema)
	.output(RemovedGroupSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ groupId, keepTabs }, { send, user }) => {
		const refusal = refuseGroup(await send(appHost.tabs.tabsSidebar), groupId);

		if (refusal !== null) {
			return refuse(refusal);
		}

		await send(keepTabs ? appHost.groups.ungroup : appHost.tabActions.closeGroup, { id: groupId });
		console.info(`[widgetarium] group ${groupId} → gone, its tabs ${keepTabs ? "kept" : "closed"} (chat ${user.id})`);
		return {
			deleted: groupId,
			keptTabs: keepTabs,
		};
	});
