import { useCommand } from "@widgetarium/data-framework";
import { commandMenu } from "@sumi/command-menu/contract";

export function useTogglesMenuOnShown(shownName: string, pageId: string | null): () => void {
	const openMenu = useCommand(commandMenu.opening.toggle);
	return () => void openMenu.run({ door: "this-tab", text: null, shownName, pageId });
}
