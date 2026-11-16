import { query, subscriber } from "#module";
import { placedTabsChanged } from "../../gateways/tabs/tabs.events.js";
import { OpenChatsSchema } from "../../shared/schema/chat-facts.schema.js";
import { chatTabRowsOf } from "../../shared/lib/chat-tabs.js";

export const all = query()
	.public()
	.output(OpenChatsSchema)
	.handle(async (_input, { tabs, placedApps }) => ({
		open: [...chatTabRowsOf({ ...(await tabs.placedTabs()), apps: placedApps.placedApps() }).open],
	}));

export const rereadOpenChats = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});
