import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { apps } from "@sumi/apps/contract";
import { commandMenu } from "@sumi/command-menu/contract";
import type { SplitSide } from "./drag-aim.js";
import { shownTabOf, stripItemsOf } from "./strip-items.js";

export interface NewTabs {
	readonly open: () => void;
	readonly split: (side: SplitSide) => void;
}

const HOME_APP = "home";
const NEW_TAB_DOOR = "new-tab";
const SPLIT_SKIPPED = "[widgetarium] split {side} skipped: {why}";
const NO_HOME = "no home app to open beside the shown tab";
const NOTHING_SHOWN = "no tab is shown";

export function useNewTabs(): NewTabs {
	const sidebar = useOptionalQuery(appHost.tabs.tabsSidebar).data;
	const appList = useOptionalQuery(apps.apps.all).data;
	const openTab = useCommand(appHost.tabActions.openTab);
	const placeInView = useCommand(appHost.splits.placeInView);
	const openMenu = useCommand(commandMenu.opening.toggle);
	const hasHome = appList?.apps.some(({ id }) => id === HOME_APP) ?? false;
	const list = sidebar?.newTabList ?? null;
	const openHome = (show: boolean) =>
		openTab.run({
			app: HOME_APP,
			list,
			show,
		});
	return {
		open: () => {
			if (!hasHome) {
				void openMenu.run({
					door: NEW_TAB_DOOR,
					text: "",
					newTabList: list,
				});
				return;
			}

			void openHome(true);
		},
		split: (side) => {
			const shown = sidebar === null ? null : shownTabOf(stripItemsOf(sidebar));
			const skipped = SPLIT_SKIPPED.replace("{side}", side);

			if (!hasHome) {
				console.info(skipped.replace("{why}", NO_HOME));
				return;
			}

			if (shown === null) {
				console.info(skipped.replace("{why}", NOTHING_SHOWN));
				return;
			}

			void openHome(false).then((opened) => {
				if (!opened.ok) {
					return;
				}

				void placeInView.run({
					tabId: opened.output.id,
					targetTabId: shown.id,
					side,
					isPaneMoved: false,
				});
			});
		},
	};
}
