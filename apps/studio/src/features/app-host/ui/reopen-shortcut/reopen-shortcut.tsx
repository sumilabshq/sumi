import type { RefObject } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { useShortcut } from "../../lib/shortcut/use-shortcut.js";
import { appHost } from "@widgetarium/app-host/contract";
import { REOPEN_KEY } from "../../lib/tab-keys.js";

export function ReopenShortcut({ frame }: { readonly frame: RefObject<HTMLElement | null> }): null {
	const reopenClosedTab = useCommand(appHost.tabActions.reopenClosedTab);
	useShortcut(frame, {
		key: REOPEN_KEY,
		isShifted: true,
		onPress: () => void reopenClosedTab.run(),
	});
	return null;
}
