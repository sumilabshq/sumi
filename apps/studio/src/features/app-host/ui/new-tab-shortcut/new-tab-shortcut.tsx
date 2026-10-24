import type { RefObject } from "react";
import { useOpensNewTabMenu } from "../../../command-menu/lib/use-opens-new-tab-menu.js";
import { useShortcut } from "../../lib/shortcut/use-shortcut.js";
import { NEW_TAB_KEY } from "../../lib/tab-keys.js";

export function NewTabShortcut({ frame }: { readonly frame: RefObject<HTMLElement | null> }): null {
	useShortcut(frame, {
		key: NEW_TAB_KEY,
		isShifted: false,
		onPress: useOpensNewTabMenu(),
	});
	return null;
}
