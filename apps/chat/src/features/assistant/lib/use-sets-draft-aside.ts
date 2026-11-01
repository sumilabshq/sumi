import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { QueuedShown } from "@widgetarium/assistant";

export interface DraftHands {
	readonly draft: string;
	readonly fill: (text: string) => void;
	readonly composerBox: RefObject<HTMLTextAreaElement | null>;
}

export function useSetsDraftAside(editing: QueuedShown | null, { draft, fill, composerBox }: DraftHands): void {
	const aside = useRef("");
	const handledEditingId = useRef<string | null>(null);
	const said = editing?.said ?? "";
	const latest = useRef({ draft, fill, said });
	latest.current = { draft, fill, said };
	const editingId = editing?.id ?? null;
	useEffect(() => {
		const previousEditingId = handledEditingId.current;

		if (previousEditingId === editingId) {
			return;
		}

		handledEditingId.current = editingId;

		if (editingId === null) {
			console.debug(`[queue] edit of ${String(previousEditingId)} ended → the draft set aside comes back`);
			latest.current.fill(aside.current);
			return;
		}

		if (previousEditingId === null) {
			aside.current = latest.current.draft;
		}

		console.debug(`[queue] edit of ${editingId} started → the draft is set aside`);
		latest.current.fill(latest.current.said);
		requestAnimationFrame(() => caretAtEnd(composerBox.current));
	}, [editingId, composerBox]);
}

function caretAtEnd(field: HTMLTextAreaElement | null): void {
	if (field === null) {
		return;
	}

	field.focus();
	field.setSelectionRange(field.value.length, field.value.length);
}
