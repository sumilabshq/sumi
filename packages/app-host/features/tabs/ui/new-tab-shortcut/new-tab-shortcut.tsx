import type { RefObject } from "react";
import { useShortcut } from "../../../../shared/lib/shortcut/use-shortcut.js";
import { NEW_TAB_KEY } from "../../lib/tab-keys.js";
import { useOpensBrowserTab } from "../../lib/use-opens-browser-tab.js";

export function NewTabShortcut({ frame }: { readonly frame: RefObject<HTMLElement | null> }): null {
	useShortcut(frame, {
		key: NEW_TAB_KEY,
		isShifted: false,
		onPress: useOpensBrowserTab(),
	});
	return null;
}
