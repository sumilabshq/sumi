import { useCommand } from "@widgetarium/core/requests";
import { OpenTabCommand } from "@widgetarium/app-host";

export function useOpensBrowserTab(): () => void {
	const openTab = useCommand(OpenTabCommand);
	return () => void openTab.run({ app: "browser" });
}
