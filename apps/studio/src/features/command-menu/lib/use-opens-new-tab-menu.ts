import { useCommand } from "@widgetarium/core/requests";
import { OpenCommandMenuCommand } from "@widgetarium/command-menu";

export function useOpensNewTabMenu(): () => void {
	const openMenu = useCommand(OpenCommandMenuCommand);
	return () => void openMenu.run({ door: "new-tab", text: "" });
}
