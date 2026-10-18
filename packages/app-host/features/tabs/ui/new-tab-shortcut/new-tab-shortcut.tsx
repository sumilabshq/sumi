import type { RefObject } from "react";
import { useShortcut } from "../../../../shared/lib/shortcut/use-shortcut.js";
import { useOpensBrowserTab } from "../../lib/use-opens-browser-tab.js";

export const NEW_TAB_KEY = "t";

export function NewTabShortcut({ frame }: { readonly frame: RefObject<HTMLElement | null> }): null {
	useShortcut(frame, {
		key: NEW_TAB_KEY,
		onPress: useOpensBrowserTab(),
	});
	return null;
}
