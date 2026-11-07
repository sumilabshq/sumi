import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";

export function useRendersSettledMarkdown(
	render: RenderMarkdown | null,
	settled: string,
): RefObject<HTMLDivElement | null> {
	const holder = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = holder.current;
		if (!node || !render || settled === "") return undefined;
		return render(node, settled);
	}, [settled, render]);
	return holder;
}
