import { useEffect, useRef } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { StripItem } from "./strip-items.js";
import type { NewTabs } from "./use-new-tabs.js";

export interface StripKeyActs {
	readonly items: readonly StripItem[];
	readonly newTabs: NewTabs;
	readonly show: (item: StripItem) => void;
}

const DIGIT_CODE = /^Digit([1-9])$/;
const NEW_TAB_CODE = "KeyT";
const CLOSE_CODE = "KeyW";
const SPLIT_CODE = "KeyD";

export function useStripKeys(acts: StripKeyActs): void {
	const closeShown = useCommand(appHost.tabActions.closeShown);
	const keyActs = {
		...acts,
		closeShown: () => void closeShown.run(),
	};
	const latest = useRef(keyActs);
	latest.current = keyActs;
	useEffect(() => {
		const pressed = (event: KeyboardEvent): void => {
			if (event.defaultPrevented || !isCommandKey(event)) {
				return;
			}

			const run = runOfKey(event, latest.current);

			if (run === null) {
				return;
			}

			event.preventDefault();
			run();
		};
		window.addEventListener("keydown", pressed);
		return () => window.removeEventListener("keydown", pressed);
	}, []);
}

function runOfKey(event: KeyboardEvent, acts: StripKeyActs & { readonly closeShown: () => void }): (() => void) | null {
	if (event.code === SPLIT_CODE) {
		return () => acts.newTabs.split(event.shiftKey ? "bottom" : "right");
	}

	if (event.shiftKey) {
		return null;
	}

	if (event.code === NEW_TAB_CODE) {
		return acts.newTabs.open;
	}

	if (event.code === CLOSE_CODE) {
		return acts.closeShown;
	}

	const digit = DIGIT_CODE.exec(event.code)?.[1];
	const item = digit === undefined ? undefined : acts.items[Number(digit) - 1];
	return item === undefined ? null : () => acts.show(item);
}

function isCommandKey(event: KeyboardEvent): boolean {
	return event.metaKey && !event.altKey && !event.ctrlKey;
}
