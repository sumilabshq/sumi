import { createElement as h } from "react";
import type { ReactNode } from "react";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import { CONTROL_MENU } from "../../lib/control-menu-said.js";
import { CommandMenuRow } from "./command-menu-row.js";

export function ControlMenuList(): ReactNode {
	return (
		<div role="menu" aria-label={CONTROL_MENU} className="sumi-control-menu-list">
			<ListPluginSlot name="control-menu.top" props={{}} />
			<ListPluginSlot name="control-menu.rows" props={{}} />
			<CommandMenuRow />
		</div>
	);
}
