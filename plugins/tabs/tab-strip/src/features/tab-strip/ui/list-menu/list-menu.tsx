import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import { SpotMenu } from "../spot-menu/spot-menu.js";
import type { MenuSpot } from "../spot-menu/spot-menu.js";

export interface ListMenuAt extends MenuSpot {
	readonly list: string;
}

export interface ListMenuProps {
	readonly at: ListMenuAt | null;
	readonly onClose: () => void;
}

const MENU_LABEL = "Tab list";

export function ListMenu({ at, onClose }: ListMenuProps): ReactElement {
	return (
		<SpotMenu at={at} onClose={onClose}>
			{(shown) => (
				<div role="menu" aria-label={MENU_LABEL}>
					<ListPluginSlot name="tab-strip.list-menu-items" props={{ list: shown.list, onDone: onClose }} />
				</div>
			)}
		</SpotMenu>
	);
}
