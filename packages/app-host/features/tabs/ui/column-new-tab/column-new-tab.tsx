import { createElement as h } from "react";
import type { ReactElement } from "react";
import { COMMAND_KEY } from "../../../../shared/lib/shortcut/key-hint.js";
import { ColumnFootRow } from "../../../../shared/ui/column-foot/column-foot-row.js";
import { NEW_TAB_KEY } from "../../lib/tab-keys.js";
import { useOpensBrowserTab } from "../../lib/use-opens-browser-tab.js";

const NEW_TAB = "New tab";

export function ColumnNewTab(): ReactElement {
	return (
		<ColumnFootRow
			icon="plus"
			label={NEW_TAB}
			hint={`${COMMAND_KEY} ${NEW_TAB_KEY.toUpperCase()}`}
			onClick={useOpensBrowserTab()}
			data-host-column-add=""
		/>
	);
}
