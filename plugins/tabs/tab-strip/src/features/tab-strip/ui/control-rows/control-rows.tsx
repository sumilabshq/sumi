import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { Icon, PopoverSeparator } from "@widgetarium/kit";
import { ControlMenuRow, useControlMenu } from "@sumi/control-menu-plugin";
import { copyLink } from "../../lib/copy-link.js";
import { isShownItem, stripItemsOf, tabOf } from "../../lib/strip-items.js";
import { SplitRows } from "../split-rows/split-rows.js";

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
		</>
	);
}
