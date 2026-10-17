import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const SHOWN_TAB = '[aria-selected="true"]';

export function useKeepsShownInView(shownId: string | null): RefObject<HTMLDivElement | null> {
	const row = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		row.current?.querySelector(SHOWN_TAB)?.scrollIntoView({
			block: "nearest",
			inline: "nearest",
		});
	}, [shownId]);
	return row;
}
