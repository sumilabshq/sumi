import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { ComposerPrefillQuery, TakePrefillCommand } from "@widgetarium/assistant";
import { useChatKey } from "../../../shared/lib/chat-key-context.js";

export function useTakesPrefill(
	composerBox: RefObject<HTMLTextAreaElement | null>,
	fill: (text: string) => void,
): void {
	const chat = useChatKey();
	const prefill = useQuery(ComposerPrefillQuery, { chat }).data;
	const takePrefill = useCommand(TakePrefillCommand);
	const taken = useRef<number | null>(null);

	useEffect(() => {
		if (prefill === null || prefill.id === taken.current) {
			return;
		}

		taken.current = prefill.id;
		fill(prefill.text);
		composerBox.current?.focus();
		void takePrefill.run({ chat, id: prefill.id });
	}, [prefill, fill, composerBox, takePrefill, chat]);
}
