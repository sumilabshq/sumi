import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { Icon } from "@widgetarium/kit";
import { OpenTabCommand } from "../../../features/tabs/contract.js";
import { keyHintOf } from "../../lib/shortcut/key-hint.js";
import { KEY_HINT, ROW_WORDS, SIDEBAR_ROW } from "../../lib/tabs-look/tabs-look.js";

const NEW_TAB = "New tab";
const NEW_TAB_KEY = "t";

export function NewTabRow(): ReactElement {
	const openTab = useCommand(OpenTabCommand);
	return (
		<button
			type="button"
			className={`${SIDEBAR_ROW} cv:cursor-pointer cv:[&>svg]:mx-px cv:[&>svg]:text-(--sumi-text-2)`}
			onClick={() => void openTab.run({ app: "browser" })}
			data-host-column-add=""
		>
			<Icon name="plus" size={16} />
			<span className={ROW_WORDS}>{NEW_TAB}</span>
			<kbd className={KEY_HINT} data-host-new-tab-key="">
				{keyHintOf(NEW_TAB_KEY, false)}
			</kbd>
		</button>
	);
}
