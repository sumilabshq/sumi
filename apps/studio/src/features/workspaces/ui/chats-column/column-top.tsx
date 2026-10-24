import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { SearchButton } from "../../../command-menu/ui/search-button/search-button.js";
import { InertButton } from "../inert-button/inert-button.js";

const FILTER = "Filter";
const TOP_ICON_PX = 16;

export function ColumnTop(): ReactElement {
	return (
		<div className="wg-ws-top" data-ws-top="">
			<InertButton label={FILTER} className="wg-ws-top-button">
				<Icon name="list-filter" size={TOP_ICON_PX} />
			</InertButton>
			<SearchButton className="wg-ws-top-button" iconPx={TOP_ICON_PX} />
		</div>
	);
}
