import { appHost } from "@widgetarium/app-host/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { query, subscriber } from "#module";
import { SessionPageAskSchema, SessionPageSchema } from "../../shared/schema/sessions.schema.js";
import { sessionPageOf } from "./lib/session-page.js";

export const page = query()
	.public()
	.input(SessionPageAskSchema)
	.output(SessionPageSchema)
	.handle(async (ask, { send }) => {
		const [here, elsewhere] = await Promise.all([
			send(workspaces.chats.chatRecords),
			send(workspaces.workspaces.chatsElsewhere),
		]);
		const answered = sessionPageOf(here, elsewhere.rows, ask);
		console.info(
			`[widgetarium] sessions ${ask.isArchived ? "archived " : ""}page "${ask.text}" up to ${ask.limit}: this workspace ${here.isRead ? `${here.chats.length} chats` : "not read yet"}, other workspaces ${elsewhere.rows.length} chats → ${answered.rows.length} rows${answered.hasMore ? ", more" : ""}`,
		);
		return answered;
	});

export const rereadOnChats = subscriber(workspaces.chats.chatsChanged).handle((_input, { invalidate }) => {
	invalidate(page);
});

export const rereadOnTabs = subscriber(appHost.tabs.tabsSettled).handle((_input, { invalidate }) => {
	invalidate(page);
});

export const rereadOnCore = subscriber(appHost.coreChanges.studioCoreChanged).handle((_input, { invalidate }) => {
	invalidate(page);
});
