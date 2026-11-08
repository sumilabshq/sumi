import { useCommand } from "@widgetarium/data-framework";
import { commandMenu } from "@sumi/command-menu/contract";

export const SHOWN_TAB_SECTION = null;

export function useTogglesNewTabMenu(newTabList: string | typeof SHOWN_TAB_SECTION): () => void {
	const openMenu = useCommand(commandMenu.opening.toggleCommandMenu);
	return () => void openMenu.run({ door: "new-tab", text: "", newTabList });
}
