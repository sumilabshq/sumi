import { useCommand } from "@widgetarium/core/requests";
import { OpenTabCommand } from "../contract.js";

export function useOpensBrowserTab(): () => void {
	const openTab = useCommand(OpenTabCommand);
	return () => void openTab.run({ app: "browser" });
}
