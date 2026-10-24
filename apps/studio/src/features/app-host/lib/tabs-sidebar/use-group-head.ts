import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import type { TabSection } from "@widgetarium/app-host";
import { groupHeadOf } from "./pointed-of.js";

export function useGroupHead(
	holder: RefObject<HTMLElement | null>,
	groupMenuId: string | null,
	sections: readonly TabSection[],
): HTMLElement | null {
	const [groupHead, setGroupHead] = useState<HTMLElement | null>(null);
	useLayoutEffect(() => setGroupHead(groupHeadOf(holder.current, groupMenuId)), [holder, groupMenuId, sections]);
	return groupHead;
}
