import { controlMenu } from "@sumi/control-menu-plugin";
import { backend, sumiHost } from "@sumi/sumi-host-plugin";
import { tabViews as tabViewsContract } from "@sumi/tab-views/contract";
import { tabViews as tabViewsModule } from "@sumi/tab-views/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import type { TabView } from "./features/tabs-view/lib/tab-view.js";
import { chosenSideOf, chosenTitleOf } from "./features/tabs-view/ui/chosen-view/chosen-view.js";
import { viewRowsOf } from "./features/tabs-view/ui/view-rows/view-rows.js";

export const tabsView = plugin("tabs-view")
	.require(backend, sumiHost, controlMenu)
	.apply((app) => {
		const views: TabView[] = [];
		app.use(backend).moduleOf(({ store }) => tabViewsModule({ store }), tabViewsContract);
		app.use(sumiHost).slots.titleTabs.add(chosenTitleOf(views));
		app.use(sumiHost).slots.frameStart.add(chosenSideOf(views));
		app.use(controlMenu).slots.rows.add(viewRowsOf(views));
		return {
			view: (entry: TabView): void => void views.push(entry),
		};
	});
