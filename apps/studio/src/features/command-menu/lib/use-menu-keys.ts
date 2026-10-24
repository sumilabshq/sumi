import type { KeyboardEvent } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { ChangeMenuDoorCommand, CloseCommandMenuCommand } from "@widgetarium/command-menu";
import type { Door } from "@widgetarium/command-menu";
import { MENU_KEY_ACTS } from "./menu-key-acts.js";
import type { KeyedMenu } from "./menu-key-acts.js";

type MenuKeysAsk = Omit<KeyedMenu, "toDoor" | "close">;

export function useMenuKeys(ask: MenuKeysAsk): (event: KeyboardEvent<HTMLElement>) => void {
	const changeDoor = useCommand(ChangeMenuDoorCommand);
	const close = useCommand(CloseCommandMenuCommand);
	const menu: KeyedMenu = {
		...ask,
		toDoor: (door: Door) => ask.moves.typed(() => void changeDoor.run({ door })),
		close: () => void close.run(),
	};
	return (event) => {
		if (MENU_KEY_ACTS.some((act) => act(event, menu))) {
			event.preventDefault();
		}
	};
}
