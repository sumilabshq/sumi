import { createElement as h, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { PaneTreeQuery } from "@widgetarium/layout";
import { ChatWindowsContext, ShownChatsContext } from "../features/workspaces/lib/shown-chats.js";

export function ChatsInPanes({ children }: { readonly children: ReactNode }): ReactElement {
	const { leaves, elsewhere } = useQuery(PaneTreeQuery).data;
	const shownIds = leaves.flatMap((leaf) =>
		leaf.view.kind === "chat" && leaf.view.chatId !== undefined ? [leaf.view.chatId] : [],
	);
	const key = shownIds.join();
	const shown = useMemo(() => new Set(key === "" ? [] : key.split(",")), [key]);
	const windowsKey = JSON.stringify(elsewhere.map(({ window, chatIds }) => [window, chatIds]));
	const windows = useMemo(
		() =>
			new Map(
				(JSON.parse(windowsKey) as [string, string[]][]).flatMap(([window, chatIds]) =>
					chatIds.map((chatId) => [chatId, window] as const),
				),
			),
		[windowsKey],
	);
	return h(ShownChatsContext.Provider, { value: shown }, h(ChatWindowsContext.Provider, { value: windows }, children));
}
