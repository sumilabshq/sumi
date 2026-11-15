import { useEffect } from "react";
import type { RefObject } from "react";
import { wantsJelly } from "../utils/jelly-throw";
import { followHighlight } from "../utils/pop-glide";

export function usePopGlide(panelRef: RefObject<HTMLElement | null>, isShown: boolean): void {
	useEffect(() => {
		const panel = panelRef.current;

		if (!isShown || panel === null || !wantsJelly(panel)) {
			return undefined;
		}

		return followHighlight(panel);
	}, [panelRef, isShown]);
}
