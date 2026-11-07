import { useEffect } from "react";
import { useRuntime } from "@widgetarium/data-framework";
import { recordTabPage } from "../../../shared/lib/record-tab-page.js";
import { useTakesActionPresses } from "./use-takes-action-presses.js";

const RELOAD = "reload";
const RELOAD_LABEL = "Reload";
const RELOAD_ICON = "rotate-cw";

export function useOffersReload(tabId: string, isBusy: boolean, reload: () => void): void {
	const shell = useRuntime("useOffersReload");
	useTakesActionPresses(tabId, { [RELOAD]: reload });
	useEffect(() => {
		recordTabPage(shell, tabId, { actions: [{ id: RELOAD, label: RELOAD_LABEL, icon: RELOAD_ICON, isBusy }] });
		return () => recordTabPage(shell, tabId, { actions: [] });
	}, [shell, tabId, isBusy]);
}
