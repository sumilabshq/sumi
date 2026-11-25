import { useEffect } from "react";
import type { RefObject } from "react";
import { followHighlight } from "../utils/pop-glide";

export function usePopGlide(panelRef: RefObject<HTMLElement | null>, isShown: boolean): void {
	useEffect(() => {
		const panel = panelRef.current;
		if (!isShown || panel === null) return undefined;
		return followHighlight(panel);
	}, [panelRef, isShown]);
}
