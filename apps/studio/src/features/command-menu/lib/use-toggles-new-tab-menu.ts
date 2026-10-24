import { useCommand } from "@widgetarium/core/requests";
import { ToggleCommandMenuCommand } from "@widgetarium/command-menu";

export function useTogglesNewTabMenu(): () => void {
	const openMenu = useCommand(ToggleCommandMenuCommand);
	return () => void openMenu.run({ door: "new-tab", text: "" });
}
