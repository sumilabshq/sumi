import { useCommand } from "@widgetarium/data-framework";
import { ToggleCommandMenuCommand } from "@sumi/command-menu";

export function useTogglesMenuOnShown(shownName: string, pageId: string | null): () => void {
	const openMenu = useCommand(ToggleCommandMenuCommand);
	return () => void openMenu.run({ door: "this-tab", text: null, shownName, pageId });
}
