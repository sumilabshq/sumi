import { useCommand } from "@widgetarium/data-framework";
import { TearOffChatCommand, TearOffTabCommand } from "@widgetarium/app-host";
import type { TabRef } from "../tab-drag/tab-ref.js";

export function useTearsOffRows(): (row: TabRef) => void {
	const tearOffTab = useCommand(TearOffTabCommand);
	const tearOffChat = useCommand(TearOffChatCommand);
	const tearOff = async ({ id, isChat }: TabRef): Promise<void> => {
		const answer = isChat ? await tearOffChat.run({ chatId: id }) : await tearOffTab.run({ id });

		if (!answer.ok) {
			console.warn(
				`[widgetarium] ${isChat ? "chat" : "tab"} ${id} lifted → resting (tear-off refused: ${answer.reason})`,
			);
		}
	};
	return (row) => void tearOff(row);
}
