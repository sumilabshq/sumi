import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { MENU_DOOR_MARK } from "../../../command-menu/lib/menu-door-mark.js";
import { useTogglesNewTabMenu } from "../../../command-menu/lib/use-toggles-new-tab-menu.js";
import { keyHintOf } from "../../lib/shortcut/key-hint.js";
import { KEY_HINT, ROW_WORDS, SIDEBAR_ROW } from "../../lib/tabs-look/tabs-look.js";

const NEW_TAB = "New tab";
const NEW_TAB_KEY = "t";

export function NewTabRow(): ReactElement {
	const openNewTabMenu = useTogglesNewTabMenu();
	return (
		<button
			type="button"
			className={`${SIDEBAR_ROW} cv:cursor-pointer cv:[&>svg]:mx-px cv:[&>svg]:text-(--sumi-text-2)`}
			onClick={openNewTabMenu}
			data-host-column-add=""
			{...MENU_DOOR_MARK}
		>
			<Icon name="plus" size={16} />
			<span className={ROW_WORDS}>{NEW_TAB}</span>
			<kbd className={KEY_HINT} data-host-new-tab-key="">
				{keyHintOf(NEW_TAB_KEY, false)}
			</kbd>
		</button>
	);
}
