import { useEffect } from "react";
import type { ComposerInput } from "@sumi/chat-plugin";

export function useTakesOnTab(input: ComposerInput, suggestion: string | null, suggest: (next: null) => void): void {
	const { box, draft, replaceDraft } = input;

	useEffect(() => {
		const field = box.current;

		if (field === null || suggestion === null || draft !== "") {
			return;
		}

		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key !== "Tab" || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
				return;
			}

			event.preventDefault();
			replaceDraft(suggestion, suggestion.length);
			suggest(null);
		};
		field.addEventListener("keydown", onKeyDown);
		return () => field.removeEventListener("keydown", onKeyDown);
	}, [box, suggestion, draft, replaceDraft, suggest]);
}
