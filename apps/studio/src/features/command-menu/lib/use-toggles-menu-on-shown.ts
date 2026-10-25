import { useCommand } from "@widgetarium/core/requests";
import { ToggleCommandMenuCommand } from "@widgetarium/command-menu";

export function useTogglesMenuOnShown(shownName: string, pageId: string | null): () => void {
	const openMenu = useCommand(ToggleCommandMenuCommand);
	return () => void openMenu.run({ door: "this-tab", text: null, shownName, pageId });
}
