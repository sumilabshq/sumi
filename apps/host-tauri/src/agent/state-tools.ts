import { AppTabsQuery, TabsSidebarQuery } from "@widgetarium/app-host";
import { ChatListQuery } from "@widgetarium/workspaces";
import { AppStateInputSchema, appStateOf } from "./app-state.js";
import type { AppState } from "./app-state.js";
import { inputOf, outputOf } from "./tool-places.js";
import type { ToolContext } from "./tool-places.js";

const APPS = [
	{
		id: "browser",
		name: "Browser",
		reaches: "web pages, with the site access the person set",
	},
	{
		id: "canvas",
		name: "Canvas",
		reaches: "the workspace's boards and widgets",
	},
];

export async function appState({ app, chatId }: ToolContext, input: unknown): Promise<AppState> {
	const asked = inputOf(AppStateInputSchema, "app_state", input);
	const [sidebar, chats, tabs] = await Promise.all([
		outputOf(app.send(TabsSidebarQuery)),
		outputOf(app.send(ChatListQuery)),
		outputOf(app.send(AppTabsQuery)),
	]);
	return appStateOf({ sidebar, chats, tabs }, chatId, asked);
}

export function appsList(): Promise<{ readonly apps: typeof APPS }> {
	return Promise.resolve({ apps: APPS });
}
