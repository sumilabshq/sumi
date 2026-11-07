import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { SearchButton } from "../search-button/search-button.js";
import { InertButton } from "../inert-button/inert-button.js";

const SETTINGS = "Settings";
const TOP_ICON_PX = 16;

export function ColumnTop(): ReactElement {
	return (
		<div className="wg-ws-top" data-ws-top="">
			<InertButton label={SETTINGS} className="wg-ws-top-button">
				<Icon name="settings-2" size={TOP_ICON_PX} />
			</InertButton>
			<SearchButton className="wg-ws-top-button" iconPx={TOP_ICON_PX} />
		</div>
	);
}
