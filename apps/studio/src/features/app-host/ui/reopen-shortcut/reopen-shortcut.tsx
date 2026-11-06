import type { RefObject } from "react";
import { useCommand } from "@widgetarium/framework";
import { useShortcut } from "../../lib/shortcut/use-shortcut.js";
import { ReopenClosedTabCommand } from "@widgetarium/app-host";
import { REOPEN_KEY } from "../../lib/tab-keys.js";

export function ReopenShortcut({ frame }: { readonly frame: RefObject<HTMLElement | null> }): null {
	const reopenClosedTab = useCommand(ReopenClosedTabCommand);
	useShortcut(frame, {
		key: REOPEN_KEY,
		isShifted: true,
		onPress: () => void reopenClosedTab.run(),
	});
	return null;
}
