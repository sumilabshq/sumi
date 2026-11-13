import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { CHAT_LOOK, createCodeBlock } from "@widgetarium/markdown";

export function useMountsCodeBlock(info: string, body: string): RefObject<HTMLDivElement | null> {
	const holder = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = holder.current;

		if (!node) {
			return undefined;
		}

		node.replaceChildren(
			createCodeBlock(node.ownerDocument, {
				info,
				body,
				look: CHAT_LOOK,
			}),
		);
		return () => node.replaceChildren();
	}, [info, body]);
	return holder;
}
