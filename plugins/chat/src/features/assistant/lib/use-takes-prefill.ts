import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { ComposerPrefillQuery, TakePrefillCommand } from "@widgetarium/assistant";

export function useTakesPrefill(
	composerBox: RefObject<HTMLTextAreaElement | null>,
	fill: (text: string) => void,
): void {
	const prefill = useQuery(ComposerPrefillQuery).data;
	const takePrefill = useCommand(TakePrefillCommand);
	const taken = useRef<number | null>(null);

	useEffect(() => {
		if (prefill === null || prefill.id === taken.current) {
			return;
		}

		taken.current = prefill.id;
		fill(prefill.text);
		composerBox.current?.focus();
		void takePrefill.run({ id: prefill.id });
	}, [prefill, fill, composerBox, takePrefill]);
}
