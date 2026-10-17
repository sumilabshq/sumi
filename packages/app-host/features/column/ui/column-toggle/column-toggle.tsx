import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RoundButton } from "@widgetarium/canvas";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { Icon } from "@widgetarium/kit";
import { TabsColumnQuery, ToggleColumnCommand } from "../../contract.js";

const SHOW_TABS = "Show tabs";
const HIDE_TABS = "Hide tabs";

export function ColumnToggle(): ReactElement {
	const { look, side } = useQuery(TabsColumnQuery).data;
	const toggleColumn = useCommand(ToggleColumnCommand);
	const isShown = look !== "hidden";
	return (
		<RoundButton
			label={isShown ? HIDE_TABS : SHOW_TABS}
			aria-pressed={isShown}
			aria-keyshortcuts="Meta+Backslash"
			tone="raise"
			size="l"
			onClick={() => void toggleColumn.run()}
			data-host-column-toggle=""
		>
			<Icon name={side === "end" ? "panel-right" : "panel-left"} size={18} />
		</RoundButton>
	);
}
