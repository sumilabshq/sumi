import { createElement as h, useRef, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { useComposerDraft } from "../../lib/use-composer-draft.js";
import { useFitsDraft } from "../../lib/use-fits-draft.js";
import { useFocusesWhen } from "../../lib/use-focuses-when.js";
import { useTakesPrefill } from "../../lib/use-takes-prefill.js";
import { useSlashMenu } from "../../lib/use-slash-menu.js";
import { saidPiecesOf } from "../../lib/slash-matches.js";
import { SlashMenu } from "../slash-menu/slash-menu.js";
import { AttachedChip } from "./attached-change.js";
import type { Attached } from "./attached-change.js";
import { CommandSaid } from "./command-said.js";
import { ComposerTools } from "./composer-tools.js";
import { DraftAttachments } from "./draft-attachments.js";
import { SendButton } from "./send-button.js";

export interface ComposerProps {
	readonly busy: boolean;
	readonly strip?: ReactNode;
	readonly isFirst: boolean;
	readonly attached: Attached | null;
	readonly onSend: (said: string) => Promise<boolean>;
	readonly onStop: () => void;
	readonly onTyped: () => void;
}

const FIRST_PLACEHOLDER = "Describe what to build or change · ↵ send · ⇧↵ new line · / commands";
const NEXT_PLACEHOLDER = "Ask for the next change · ↵ send · ⇧↵ new line";

export function Composer({
	busy,
	strip = null,
	isFirst,
	attached,
	onSend,
	onStop,
	onTyped,
}: ComposerProps): ReactElement {
	const composerBox = useRef<HTMLTextAreaElement>(null);
	const mirror = useRef<HTMLDivElement>(null);
	const [isFocused, setFocused] = useState(false);
	const { draft, state, sendDraft, onChange, onKeyDown, onPaste, fill } = useComposerDraft({ busy, onSend, onTyped });
	useFitsDraft(composerBox, draft);
	useFocusesWhen(composerBox, attached?.label ?? null);
	useTakesPrefill(composerBox, fill);
	const slash = useSlashMenu({ draft, fill, box: composerBox });
	const saidPieces = saidPiecesOf(slash.entries, draft);
	return (
		<div className="wg-studio-ai-composer">
			<SlashMenu slash={slash} draft={draft} />
			<div
				className={`wg-studio-ai-field${isFocused ? " is-focused" : ""}`}
				onClick={(event) => focusBox(event, composerBox.current)}
			>
				<DraftAttachments />
				{attached ? <AttachedChip attached={attached} /> : null}
				<div className="wg-studio-ai-box-frame">
					{saidPieces === null ? null : <CommandSaid pieces={saidPieces} mirror={mirror} />}
					<textarea
						ref={composerBox}
						className={saidPieces === null ? "wg-studio-ai-box" : "wg-studio-ai-box has-command"}
						rows={1}
						value={draft}
						placeholder={isFirst ? FIRST_PLACEHOLDER : NEXT_PLACEHOLDER}
						onChange={onChange}
						onKeyDown={(event) => {
							if (!slash.takesKey(event)) {
								onKeyDown(event);
							}
						}}
						onPaste={onPaste}
						onPointerDown={slash.reopen}
						onScroll={(event) => scrollMirror(mirror.current, event.currentTarget.scrollTop)}
						onFocus={() => {
							setFocused(true);
							slash.reopen();
						}}
						onBlur={() => setFocused(false)}
					/>
				</div>
				<div className="wg-studio-ai-field-bar">
					<ComposerTools />
					<span className="wg-studio-ai-bar-space" />
					<SendButton state={state} onSend={sendDraft} onStop={onStop} />
				</div>
			</div>
			{strip}
		</div>
	);
}

function focusBox(event: MouseEvent<HTMLDivElement>, box: HTMLTextAreaElement | null): void {
	if (event.target instanceof Element && event.target.closest("button, textarea, input")) return;
	box?.focus();
}

function scrollMirror(mirror: HTMLDivElement | null, scrollTop: number): void {
	if (mirror === null) {
		return;
	}

	mirror.scrollTop = scrollTop;
}
