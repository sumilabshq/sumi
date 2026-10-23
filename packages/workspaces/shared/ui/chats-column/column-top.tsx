import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { InertButton } from "../inert-button/inert-button.js";

const FILTER = "Filter";
const SEARCH = "Search chats";
const TOP_ICON_PX = 16;

export function ColumnTop(): ReactElement {
	return (
		<div className="wg-ws-top" data-ws-top="">
			<InertButton label={FILTER} className="wg-ws-top-button">
				<Icon name="list-filter" size={TOP_ICON_PX} />
			</InertButton>
			<InertButton label={SEARCH} className="wg-ws-top-button">
				<Icon name="search" size={TOP_ICON_PX} />
			</InertButton>
		</div>
	);
}
