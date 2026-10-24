import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { AttachPagesCommand, DetachPagesCommand } from "@widgetarium/browser";
import { useCommand } from "@widgetarium/core/requests";
import { useHeldTab } from "./held-tab.js";

export function useHoldsPages(isAvailable: boolean): RefObject<HTMLDivElement | null> {
	const pages = useRef<HTMLDivElement | null>(null);
	const heldTabId = useHeldTab();
	const attachPages = useCommand(AttachPagesCommand);
	const detachPages = useCommand(DetachPagesCommand);

	useEffect(() => {
		const held = pages.current;

		if (!held || !isAvailable) {
			return undefined;
		}

		void attachPages.run({
			host: held,
			heldTabId,
		});
		return () =>
			void detachPages.run({
				host: held,
				heldTabId,
			});
	}, [isAvailable, heldTabId, attachPages.run, detachPages.run]);

	return pages;
}
