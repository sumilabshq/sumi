import { useCommand } from "@widgetarium/core/requests";
import { OpenCommandMenuCommand } from "@widgetarium/command-menu";

export function useOpensMenuOnShown(shownName: string): () => void {
	const openMenu = useCommand(OpenCommandMenuCommand);
	return () => void openMenu.run({ door: "this-tab", text: null, shownName });
}
