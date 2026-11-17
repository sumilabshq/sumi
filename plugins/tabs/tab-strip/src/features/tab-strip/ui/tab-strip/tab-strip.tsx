import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import { appHost } from "@widgetarium/app-host/contract";
import { itemIdOf, stripItemsOf } from "../../lib/strip-items.js";
import { useNewTabs } from "../../lib/use-new-tabs.js";
import { useTabActs } from "../../lib/use-tab-acts.js";
import { useTabDrag } from "../../lib/use-tab-drag.js";
import { runIdOf, stripRunsOf } from "../../lib/strip-runs.js";
import { DragLayer } from "../drag-layer/drag-layer.js";
import { ListMenu } from "../list-menu/list-menu.js";
import type { ListMenuAt } from "../list-menu/list-menu.js";
import { NewTabButton } from "../new-tab-button/new-tab-button.js";
import { StripRun } from "../strip-run/strip-run.js";
import { TabMenu } from "../tab-menu/tab-menu.js";
import type { TabMenuAt } from "../tab-menu/tab-menu.js";

const STRIP_LABEL = "Tabs";

export function TabStrip(): ReactElement {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const items = stripItemsOf(sidebar);
	const strip = useRef<HTMLDivElement | null>(null);
	const acts = useTabActs({
		items,
		newTabList: sidebar.newTabList,
	});
	const drag = useTabDrag(strip, acts.drop);
	const newTabs = useNewTabs();
	const [menu, setMenu] = useState<TabMenuAt | null>(null);
	const [listMenu, setListMenu] = useState<ListMenuAt | null>(null);
	const liftedId = drag.lifted === null ? null : itemIdOf(drag.lifted.item);
	return (
		<div
			className="sumi-tab-strip"
			data-count={items.length}
			onContextMenu={(event) => {
				if (event.defaultPrevented) {
					return;
				}

				event.preventDefault();
				setListMenu({
					list: sidebar.newTabList,
					x: event.clientX,
					y: event.clientY,
				});
			}}
		>
			<div ref={strip} className="sumi-tab-strip-tabs" role="tablist" aria-label={STRIP_LABEL}>
				<ListPluginSlot name="tab-strip.leading" props={{ newTabList: sidebar.newTabList }} />
				{stripRunsOf(sidebar).map((run) => (
					<StripRun
						key={runIdOf(run)}
						run={run}
						acts={acts}
						drag={drag}
						liftedId={liftedId}
						onMenu={(pointed, event) =>
							setMenu({
								item: pointed,
								x: event.clientX,
								y: event.clientY,
							})
						}
					/>
				))}
				<NewTabButton onOpen={newTabs.open} />
			</div>
			{drag.lifted === null ? null : <DragLayer lifted={drag.lifted} />}
			<TabMenu at={menu} acts={acts} hasOthers={items.length > 1} onClose={() => setMenu(null)} />
			<ListMenu at={listMenu} onClose={() => setListMenu(null)} />
		</div>
	);
}
