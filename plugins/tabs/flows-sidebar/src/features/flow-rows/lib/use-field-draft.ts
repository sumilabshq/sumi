import { useRef, useState } from "react";

export interface FieldDraft {
	readonly typed: string;
	setTyped(typed: string): void;
	finish(isCommitted: boolean): void;
}

export interface FieldDraftAsk {
	readonly name: string;
	readonly onCommit: (name: string) => void;
	readonly onDone: () => void;
}

export function useFieldDraft({ name, onCommit, onDone }: FieldDraftAsk): FieldDraft {
	const [typed, setTyped] = useState(name);
	const isSettled = useRef(false);
	return {
		typed,
		setTyped,
		finish: (isCommitted) => {
			if (isSettled.current) {
				return;
			}

			isSettled.current = true;
			const trimmed = typed.trim();

			if (isCommitted && trimmed !== "" && trimmed !== name) {
				onCommit(trimmed);
			}

			onDone();
		},
	};
}
