import { createContext, useContext } from "react";
import type { Runtime } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";

export type TitleBy = "auto" | "person";

export interface TitleKeeper {
	isAskedTitle(chatId: string): Promise<boolean>;
	name(chatId: string, title: string, by: TitleBy): Promise<void>;
}

const NO_TITLE_KEEPER: TitleKeeper = {
	isAskedTitle: () => Promise.resolve(false),
	name: () => Promise.resolve(),
};

export const TitleKeeperContext = createContext<TitleKeeper>(NO_TITLE_KEEPER);

export function useTitleKeeper(): TitleKeeper {
	return useContext(TitleKeeperContext);
}

export function titleKeeperOf(windowApp: Runtime): TitleKeeper {
	return {
		isAskedTitle: async (chatId) => {
			const answer = await windowApp.send(workspaces.chats.chatRecords);
			return answer.ok && answer.output.chats.some(({ id, titleBy }) => id === chatId && titleBy === "ask");
		},
		name: async (chatId, title, by) => {
			const answer = await windowApp.send(workspaces.chats.renameChat, {
				id: chatId,
				title,
				by,
			});

			if (!answer.ok) {
				console.error(`[widgetarium] ${by} title of chat ${chatId} not kept: ${answer.reason}`);
			}
		},
	};
}
