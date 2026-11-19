import { appHost } from "@widgetarium/app-host/contract";
import { subscriber } from "#module";
import { nameChatsAfterTabLabels } from "./lib/tab-names.js";

export const nameChatsAfterTabs = subscriber(appHost.tabs.tabsSettled).handle(async (_input, { send }) => {
	await nameChatsAfterTabLabels(send);
});
