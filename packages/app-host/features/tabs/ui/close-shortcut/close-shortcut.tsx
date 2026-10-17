import type { RefObject } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { useShortcut } from "../../../../shared/lib/shortcut/use-shortcut.js";
import { CloseShownTabCommand } from "../../contract.js";

const CLOSE_KEY = "w";

export function CloseShortcut({ frame }: { readonly frame: RefObject<HTMLElement | null> }): null {
	const closeShownTab = useCommand(CloseShownTabCommand);
	useShortcut(frame, {
		key: CLOSE_KEY,
		onPress: () => void closeShownTab.run(),
	});
	return null;
}
