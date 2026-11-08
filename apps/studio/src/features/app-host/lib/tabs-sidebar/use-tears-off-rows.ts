import { useCommand } from "@widgetarium/data-framework";
import { TearOffTabCommand } from "@widgetarium/app-host";
import type { TabRef } from "../tab-drag/tab-ref.js";

export function useTearsOffRows(): (row: TabRef) => void {
	const tearOffTab = useCommand(TearOffTabCommand);
	const tearOff = async ({ id, isHolder }: TabRef): Promise<void> => {
		const answer = await tearOffTab.run({ id });

		if (!answer.ok) {
			console.warn(
				`[widgetarium] ${isHolder ? "chat" : "tab"} ${id} lifted → resting (tear-off refused: ${answer.reason})`,
			);
		}
	};
	return (row) => void tearOff(row);
}
