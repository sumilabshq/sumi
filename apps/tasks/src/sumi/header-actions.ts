import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { startHeaderActions } from "@sumi/contract";
import type { HeaderAction, HeaderActions } from "@sumi/contract";
import type { SumiFrame } from "./sumi-frame.js";

export const HeaderActionsContext = createContext<HeaderActions | null>(null);

export function useStartsHeaderActions(frame: SumiFrame): HeaderActions | null {
	const [started, setStarted] = useState<HeaderActions | null>(null);
	useEffect(() => {
		const headerActions = startHeaderActions(frame);
		setStarted(headerActions);
		return headerActions.stop;
	}, [frame]);
	return started;
}

export function useShowsHeaderActions(actions: readonly HeaderAction[]): void {
	const headerActions = useContext(HeaderActionsContext);
	const latestActions = useRef(actions);
	latestActions.current = actions;
	const shownKey = shownKeyOf(actions);
	useEffect(() => {
		if (headerActions === null) {
			return;
		}

		headerActions.show(latestRunsOf(latestActions));
		return () => headerActions.show([]);
	}, [headerActions, shownKey]);
}

function shownKeyOf(actions: readonly HeaderAction[]): string {
	return JSON.stringify(actions.map(({ id, label, icon, isOff, isBusy }) => [id, label, icon, isOff, isBusy]));
}

function latestRunsOf(latestActions: RefObject<readonly HeaderAction[]>): HeaderAction[] {
	return latestActions.current.map((action) => ({
		...action,
		run: () => latestActions.current.find(({ id }) => id === action.id)?.run(),
	}));
}
