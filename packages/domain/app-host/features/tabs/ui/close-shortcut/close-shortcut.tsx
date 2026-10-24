import type { RefObject } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { useShortcut } from "../../../../shared/lib/shortcut/use-shortcut.js";
import { CloseShownTabCommand } from "../../contract.js";
import { CLOSE_KEY } from "../../lib/tab-keys.js";

export function CloseShortcut({ frame }: { readonly frame: RefObject<HTMLElement | null> }): null {
	const closeShownTab = useCommand(CloseShownTabCommand);
	useShortcut(frame, {
		key: CLOSE_KEY,
		isShifted: false,
		onPress: () => void closeShownTab.run(),
	});
	return null;
}
