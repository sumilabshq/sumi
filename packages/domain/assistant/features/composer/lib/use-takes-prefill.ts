import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { ComposerPrefillQuery } from "../contract.js";

export function useTakesPrefill(
	composerBox: RefObject<HTMLTextAreaElement | null>,
	fill: (text: string) => void,
): void {
	const prefill = useQuery(ComposerPrefillQuery).data;
	const taken = useRef(prefill?.id ?? null);

	useEffect(() => {
		if (prefill === null || prefill.id === taken.current) {
			return;
		}

		taken.current = prefill.id;
		fill(prefill.text);
		composerBox.current?.focus();
	}, [prefill, fill, composerBox]);
}
