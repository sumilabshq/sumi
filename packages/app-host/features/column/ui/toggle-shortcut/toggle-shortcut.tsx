import type { RefObject } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { useShortcut } from "../../../../shared/lib/shortcut/use-shortcut.js";
import { ToggleColumnCommand } from "../../contract.js";

const TOGGLE_KEY = "\\";

export function ToggleShortcut({ frame }: { readonly frame: RefObject<HTMLElement | null> }): null {
	const toggleColumn = useCommand(ToggleColumnCommand);
	useShortcut(frame, {
		key: TOGGLE_KEY,
		onPress: () => void toggleColumn.run(),
	});
	return null;
}
