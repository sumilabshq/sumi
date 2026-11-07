import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { createCodeLines } from "@widgetarium/markdown";
import type { CodeLinesAsk } from "@widgetarium/markdown";

export function useMountsCodeLines({ body, language, wraps }: CodeLinesAsk): RefObject<HTMLDivElement | null> {
	const holder = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = holder.current;

		if (node === null) {
			return undefined;
		}

		node.replaceChildren(createCodeLines(node.ownerDocument, { body, language, wraps }));
		return () => node.replaceChildren();
	}, [body, language, wraps]);
	return holder;
}
