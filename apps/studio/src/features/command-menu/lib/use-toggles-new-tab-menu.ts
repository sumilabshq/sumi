import { useCommand } from "@widgetarium/data-framework";
import { ToggleCommandMenuCommand } from "@widgetarium/command-menu";

export const SHOWN_TAB_SECTION = null;

export function useTogglesNewTabMenu(newTabList: string | typeof SHOWN_TAB_SECTION): () => void {
	const openMenu = useCommand(ToggleCommandMenuCommand);
	return () => void openMenu.run({ door: "new-tab", text: "", newTabList });
}
