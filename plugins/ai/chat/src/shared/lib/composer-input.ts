import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { useChatKey } from "./chat-key-context.js";

export type ComposerKeyTaker = (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;

export interface ComposerInput {
	readonly chatId: string | null;
	readonly draft: string;
	readonly box: RefObject<HTMLTextAreaElement | null>;
	readonly field: RefObject<HTMLDivElement | null>;
	readonly keyTaker: RefObject<ComposerKeyTaker | null>;
	readonly replaceDraft: (text: string, caret: number) => void;
	readonly hideBoxText: (isHidden: boolean) => void;
	readonly showHint: (hint: string | null) => void;
}

export interface ComposerInputAsk {
	readonly draft: string;
	readonly fill: (text: string) => void;
	readonly box: RefObject<HTMLTextAreaElement | null>;
	readonly field: RefObject<HTMLDivElement | null>;
}

export interface ComposerInputParts {
	readonly input: ComposerInput;
	readonly takesKey: ComposerKeyTaker;
	readonly isBoxTextHidden: boolean;
	readonly hint: string | null;
}

export function useComposerInput({ draft, fill, box, field }: ComposerInputAsk): ComposerInputParts {
	const keyTaker = useRef<ComposerKeyTaker | null>(null);
	const pendingCaret = usePlacesCaretAfterDraft(box, draft);
	const [isBoxTextHidden, hideBoxText] = useState(false);
	const [hint, showHint] = useState<string | null>(null);
	return {
		input: {
			chatId: useChatKey(),
			draft,
			box,
			field,
			keyTaker,
			replaceDraft: (text, caret) => {
				pendingCaret.current = caret;
				fill(text);
			},
			hideBoxText,
			showHint,
		},
		takesKey: (event) => keyTaker.current?.(event) ?? false,
		isBoxTextHidden,
		hint,
	};
}

function usePlacesCaretAfterDraft(box: RefObject<HTMLTextAreaElement | null>, draft: string): RefObject<number | null> {
	const pendingCaret = useRef<number | null>(null);
	useLayoutEffect(() => {
		const caret = pendingCaret.current;

		if (caret === null) {
			return;
		}

		pendingCaret.current = null;
		box.current?.setSelectionRange(caret, caret);
	}, [box, draft]);
	return pendingCaret;
}
