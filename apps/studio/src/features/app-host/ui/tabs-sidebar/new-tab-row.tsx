import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, tooltipMarks } from "@widgetarium/kit";
import { OPENS_LAYER_MARK } from "@sumi/sumi-host-plugin";
import { useTogglesNewTabMenu } from "../../lib/use-toggles-new-tab-menu.js";
import { keyHintOf } from "../../lib/shortcut/key-hint.js";
import { ROW_WORDS, SIDEBAR_ROW } from "../../lib/tabs-look/tabs-look.js";

export interface NewTabRowProps {
	readonly list: string;
}

const NEW_TAB = "New tab";
const NEW_TAB_KEY = "t";

export function NewTabRow({ list }: NewTabRowProps): ReactElement {
	const openNewTabMenu = useTogglesNewTabMenu(list);
	return (
		<button
			type="button"
			className={`${SIDEBAR_ROW} cv:cursor-pointer cv:text-(--sumi-text-2) cv:[&>svg]:mx-px cv:[&>svg]:text-(--sumi-text-2)`}
			onClick={openNewTabMenu}
			data-host-column-add={list}
			{...tooltipMarks({
				said: NEW_TAB,
				keys: keyHintOf(NEW_TAB_KEY, false),
				side: "bottom",
				align: "start",
			})}
			{...OPENS_LAYER_MARK}
		>
			<Icon name="plus" size={16} />
			<span className={ROW_WORDS}>{NEW_TAB}</span>
		</button>
	);
}
