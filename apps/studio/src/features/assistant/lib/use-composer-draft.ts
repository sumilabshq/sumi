import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { DraftAttachmentsQuery, HoldDraftTextCommand } from "@widgetarium/assistant";
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
	useHoldsDraftOnLeave(draft);
	const hasInput = draft.trim() !== "" || drafted.length > 0;
	const sendDraft = (): void => {
		const said = draft.trim();
		if (!hasInput || busy) return;
		setDraft("");
		void onSend(said).then((isSent) => {
			if (!isSent) setDraft((typed) => (typed === "" ? said : typed));
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

function useHoldsDraftOnLeave(draft: string): void {
	const holdDraftText = useCommand(HoldDraftTextCommand);
	const latestDraft = useRef(draft);
	latestDraft.current = draft;
	const latestHold = useRef(holdDraftText);
	latestHold.current = holdDraftText;
	useEffect(
		() => () => {
			void latestHold.current.run({ said: latestDraft.current });
		},
		[],
	);
}
