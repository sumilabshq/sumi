import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { DraftAttachmentsQuery, HoldDraftTextCommand } from "@widgetarium/assistant";
import { toast } from "@widgetarium/kit";
import { sendState } from "./send-state.js";
import type { SendState } from "./send-state.js";
import { useAttachesFiles } from "./use-attaches-files.js";

export interface DraftAsk {
	readonly busy: boolean;
	readonly onSend: (said: string) => Promise<boolean>;
	readonly onTyped: () => void;
}

export interface ComposerDraft {
	readonly draft: string;
	readonly state: SendState;
	readonly sendDraft: () => void;
	readonly onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
	readonly onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
	readonly onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
	readonly fill: (text: string) => void;
}

export function useComposerDraft({ busy, onSend, onTyped }: DraftAsk): ComposerDraft {
	const [draft, setDraft] = useState("");
	const attach = useAttachesFiles();
	const { data: drafted } = useQuery(DraftAttachmentsQuery);
	const sending = useRef<string | null>(null);
	const holdNow = useHoldsDraft({
		draft,
		attachedCount: drafted.length,
		sending,
	});
	const hasInput = draft.trim() !== "" || drafted.length > 0;
	const sendDraft = (): void => {
		const said = draft.trim();
		if (!hasInput) return;
		sending.current = said;
		setDraft("");
		void onSend(said).then((isSent) => {
			sending.current = null;

			if (!isSent) {
				setDraft((typed) => (typed === "" ? said : typed));
				return;
			}

			holdNow();
		});
	};
	return {
		draft,
		state: sendState({ busy, hasInput }),
		sendDraft,
		onChange: (event) => {
			setDraft(event.target.value);
			onTyped();
		},
		onKeyDown: (event) => {
			if (event.key !== "Enter" || event.shiftKey) return;
			event.preventDefault();
			sendDraft();
		},
		fill: setDraft,
		onPaste: (event) => {
			const files = [...event.clipboardData.files];
			if (files.length === 0) return;
			event.preventDefault();
			attach(files);
		},
	};
}

interface HeldInput {
	readonly draft: string;
	readonly attachedCount: number;
	readonly sending: RefObject<string | null>;
}

function useHoldsDraft({ draft, attachedCount, sending }: HeldInput): () => void {
	const holdDraftText = useCommand(HoldDraftTextCommand);
	const latestHold = useRef(holdDraftText);
	latestHold.current = holdDraftText;
	const latestDraft = useRef(draft);
	latestDraft.current = draft;
	const hold = (said: string): void => {
		if (said === "" && sending.current !== null) {
			console.debug("[widgetarium] the cleared composer is not held: its message is still being sent");
			return;
		}

		void latestHold.current.run({ said }).then(showsNotice);
	};
	const latestHoldOf = useRef(hold);
	latestHoldOf.current = hold;
	useEffect(() => {
		latestHoldOf.current(draft);
	}, [draft, attachedCount]);
	useEffect(
		() => () => {
			latestHoldOf.current(latestDraft.current);
		},
		[],
	);
	return () => void latestHold.current.run({ said: latestDraft.current }).then(showsNotice);
}

function showsNotice(answer: { readonly ok: boolean; readonly output?: { readonly notice: string | null } }): void {
	const notice = answer.ok ? (answer.output?.notice ?? null) : null;

	if (notice !== null) {
		toast.error(notice, { id: `draft:${notice}` });
	}
}
