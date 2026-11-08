import type { KeyboardEvent } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { commandMenu } from "@sumi/command-menu/contract";
import { ASK_COMPOSER_SELECTOR } from "./ask-composer-mark.js";
import { MENU_KEY_ACTS } from "./menu-key-acts.js";
import type { KeyedMenu } from "./menu-key-acts.js";

type MenuKeysAsk = Omit<KeyedMenu, "close">;

type MenuKey = KeyboardEvent<HTMLElement>;

export function useMenuKeys(ask: MenuKeysAsk): (event: MenuKey) => void {
	const close = useCommand(commandMenu.opening.closeCommandMenu);
	const menu: KeyedMenu = {
		...ask,
		close: () => void close.run(),
	};
	return (event) => {
		if (!isMenuKey(event)) {
			return;
		}

		if (MENU_KEY_ACTS.some((act) => act(event, menu))) {
			event.preventDefault();
		}
	};
}

function isMenuKey({ target, currentTarget }: MenuKey): boolean {
	return target instanceof Element && currentTarget.contains(target) && target.closest(ASK_COMPOSER_SELECTOR) === null;
}
