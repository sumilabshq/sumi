import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { AttachPagesCommand, DetachPagesCommand } from "../contract.js";

export function useHoldsPages(isAvailable: boolean): RefObject<HTMLDivElement | null> {
	const pages = useRef<HTMLDivElement | null>(null);
	const attachPages = useCommand(AttachPagesCommand);
	const detachPages = useCommand(DetachPagesCommand);

	useEffect(() => {
		const held = pages.current;

		if (!held || !isAvailable) {
			return undefined;
		}

		void attachPages.run({ into: held });
		return () => void detachPages.run({ from: held });
	}, [isAvailable, attachPages.run, detachPages.run]);

	return pages;
}
