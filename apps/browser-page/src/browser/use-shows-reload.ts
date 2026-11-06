import { useEffect, useRef } from "react";
import type { HeaderAction, HeaderActions } from "@sumi/contract";
import type { WebPageControls } from "./use-web-page.js";

const RELOAD_LABEL = "Reload";

export function useShowsReload(headerActions: HeaderActions, controls: WebPageControls): void {
	const latestReload = useRef(controls.reload);
	latestReload.current = controls.reload;
	const isBusy = controls.shown.isLoading;
	useEffect(() => {
		headerActions.show([reloadActionOf(isBusy, () => latestReload.current())]);
		return () => headerActions.show([]);
	}, [headerActions, isBusy]);
}

function reloadActionOf(isBusy: boolean, run: () => void): HeaderAction {
	return {
		id: "reload",
		label: RELOAD_LABEL,
		icon: "rotate-cw",
		isBusy,
		run,
	};
}
