import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { navigation } from "@widgetarium/navigation/contract";
import type { SplitSide } from "@widgetarium/navigation/contract";
import { useFlowWindow } from "../../../shared/lib/flow-window-context.js";
import type { DragAim } from "./drag-aim.js";

export interface PaneScope {
	readonly flowId: string;
	readonly paneId: string;
	readonly newTabList: string | null;
}

export interface PaneTabActs {
	readonly show: (tabId: string) => void;
	readonly close: (tabId: string) => void;
	readonly duplicate: (tabId: string) => void;
	readonly rename: (tabId: string, label: string) => void;
	readonly openHome: () => void;
	readonly splitOwn: (tabId: string, side: SplitSide) => void;
	readonly saveAsSetup: (name: string) => Promise<boolean>;
	readonly drop: (tabId: string, aim: DragAim) => void;
}

const HOME_APP = "home";

export function usePaneTabActs(scope: PaneScope): PaneTabActs {
	return {
		...usePlacementActs(scope),
		...useTabCommandActs(scope),
		saveAsSetup: useSavesSetup(scope.flowId),
	};
}

type PlacementActs = Pick<PaneTabActs, "show" | "splitOwn" | "drop">;

function usePlacementActs({ flowId, paneId }: PaneScope): PlacementActs {
	const window = useFlowWindow();
	const showTab = useCommand(navigation.flowPanes.showTab);
	const moveTab = useCommand(navigation.flowPanes.moveTab);
	const splitPane = useCommand(navigation.flowPanes.split);
	const scope = { window, flowId };
	return {
		show: (tabId) => void showTab.run({ ...scope, tabId }),
		splitOwn: (tabId, side) => void splitPane.run({ ...scope, paneId, side, tabId }),
		drop: (tabId, aim) => {
			if (aim.kind === "split") {
				void splitPane.run({ ...scope, paneId: aim.paneId, side: aim.side, tabId });
				return;
			}

			void moveTab.run({
				...scope,
				tabId,
				paneId: aim.paneId,
				before: aim.kind === "insert" ? aim.before : null,
			});
		},
	};
}

type TabCommandActs = Pick<PaneTabActs, "close" | "duplicate" | "rename" | "openHome">;

function useTabCommandActs({ flowId, paneId, newTabList }: PaneScope): TabCommandActs {
	const window = useFlowWindow();
	const focusPane = useCommand(navigation.flowPanes.focus);
	const closeTab = useCommand(appHost.tabActions.closeTab);
	const duplicate = useCommand(appHost.tabActions.duplicate);
	const renameTab = useCommand(appHost.tabActions.renameTab);
	const openTab = useCommand(appHost.tabActions.openTab);
	const focusThen = async (run: () => Promise<unknown>): Promise<void> => {
		const focused = await focusPane.run({ window, flowId, paneId });

		if (focused.ok) {
			await run();
		}
	};
	return {
		close: (tabId) => void closeTab.run({ id: tabId }),
		duplicate: (tabId) => void focusThen(() => duplicate.run({ id: tabId, list: newTabList })),
		rename: (tabId, label) => void renameTab.run({ id: tabId, label }),
		openHome: () => void focusThen(() => openTab.run({ app: HOME_APP, list: newTabList })),
	};
}

function useSavesSetup(flowId: string): PaneTabActs["saveAsSetup"] {
	const saveFrom = useCommand(navigation.setups.saveFrom);
	return async (name) => (await saveFrom.run({ flowId, name })).ok;
}
