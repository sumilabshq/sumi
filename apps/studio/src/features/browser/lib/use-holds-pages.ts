import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { browser } from "@widgetarium/browser";
import { useCommand } from "@widgetarium/data-framework";
import { useHeldTab } from "./held-tab.js";

export function useHoldsPages(isAvailable: boolean): RefObject<HTMLDivElement | null> {
	const pages = useRef<HTMLDivElement | null>(null);
	const heldTabId = useHeldTab();
	const attachPages = useCommand(browser.tabs.attachPages);
	const detachPages = useCommand(browser.tabs.detachPages);
	const hostCallsInOrder = useRef<Promise<unknown>>(Promise.resolve());

	useEffect(() => {
		const held = pages.current;

		if (!held || !isAvailable) {
			return undefined;
		}

		const asked = {
			host: held,
			heldTabId,
		};
		hostCallsInOrder.current = hostCallsInOrder.current.then(() => attachPages.run(asked));
		return () => {
			hostCallsInOrder.current = hostCallsInOrder.current.then(() => detachPages.run(asked));
		};
	}, [isAvailable, heldTabId, attachPages.run, detachPages.run]);

	return pages;
}
