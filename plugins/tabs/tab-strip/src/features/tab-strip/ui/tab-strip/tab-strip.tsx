import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import { appHost } from "@widgetarium/app-host/contract";
import { itemIdOf, stripItemsOf } from "../../lib/strip-items.js";
import { useNewTabs } from "../../lib/use-new-tabs.js";
import { useStripKeys } from "../../lib/use-strip-keys.js";
import { useTabActs } from "../../lib/use-tab-acts.js";
import { useTabDrag } from "../../lib/use-tab-drag.js";
import { runIdOf, stripRunsOf } from "../../lib/strip-runs.js";
import { DragLayer } from "../drag-layer/drag-layer.js";
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
	useStripKeys({
		items,
		newTabs,
		show: acts.show,
	});
	const liftedId = drag.lifted === null ? null : itemIdOf(drag.lifted.item);
	return (
		<div className="sumi-tab-strip" data-count={items.length}>
			<div ref={strip} className="sumi-tab-strip-tabs" role="tablist" aria-label={STRIP_LABEL}>
				<ListPluginSlot name="tab-strip.leading" props={{ newTabList: sidebar.newTabList }} />
				{stripRunsOf(items).map((run) => (
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
		</div>
	);
}
