import { z } from "zod";
import { AppTabsQuery, TabsSidebarQuery } from "@widgetarium/app-host";
import { ChatListQuery } from "@sumi/chat-tabs";
import { AppStateInputSchema, appStateOf } from "./app-state.js";
import type { AppState } from "./app-state.js";
import { inputOf, outputOf } from "./tool-places.js";
import type { ToolContext } from "./tool-places.js";

// TODO: the apps installed from the registry join this list once the agent reaches the app installer
export const AgentAppSchema = z.enum(["canvas", "browser", "terminal", "tasks"]);

const APP_WORDS: Readonly<Record<z.infer<typeof AgentAppSchema>, { readonly name: string; readonly reaches: string }>> =
	{
		browser: {
			name: "Browser",
			reaches: "web pages, with the site access the person set",
		},
		canvas: {
			name: "Canvas",
			reaches: "the workspace's boards and widgets",
		},
		terminal: {
			name: "Terminal",
			reaches: "a shell in the workspace's folder",
		},
		tasks: {
			name: "Tasks",
			reaches: "the workspace's task board, or one task when target is its id (T-12)",
		},
	};

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

const APPS = AgentAppSchema.options.map((id) => ({
	id,
	...APP_WORDS[id],
}));
