import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { layout } from "@widgetarium/layout/contract";
import { Icon, PopoverSeparator } from "@widgetarium/kit";
import { ControlMenuRow, useControlMenu } from "@sumi/control-menu-plugin";
import { copyLink } from "../../lib/copy-link.js";
import { isShownItem, stripItemsOf, tabOf } from "../../lib/strip-items.js";
import { SplitRows } from "../split-rows/split-rows.js";

const TABS_IN_SIDEBAR = "Tabs in sidebar";
const TABS_IN_HEADER = "Tabs in header";

export function ControlRows(): ReactElement {
	const sidebar = useOptionalQuery(appHost.tabs.tabsSidebar).data;
	const menu = useControlMenu();
	const shown = sidebar === null || sidebar === undefined ? undefined : stripItemsOf(sidebar).find(isShownItem);
	const address = shown === undefined ? null : tabOf(shown).address;
	return (
		<>
			{shown?.kind === "split" ? (
				<>
					<SplitRows split={shown.split} onDone={menu.close} />
					<PopoverSeparator />
				</>
			) : null}
			{address === null ? null : (
				<ControlMenuRow label="Copy link" keys={null} icon={<Icon name="link" />} onRun={() => copyLink(address)} />
			)}
			<TabsPlaceRow />
			<PopoverSeparator />
		</>
	);
}

function TabsPlaceRow(): ReactElement | null {
	const sides = useOptionalQuery(layout.frameSides.frameSides).data;
	const placeTabs = useCommand(layout.frameSides.placeTabs);

	if (sides === null || sides === undefined) {
		return null;
	}

	const isSidebar = sides.tabs === "sidebar";
	return (
		<ControlMenuRow
			label={isSidebar ? TABS_IN_HEADER : TABS_IN_SIDEBAR}
			keys={null}
			icon={<Icon name={isSidebar ? "panel-top" : "panel-left"} />}
			onRun={() => void placeTabs.run({ tabs: isSidebar ? "header" : "sidebar" })}
		/>
	);
}
