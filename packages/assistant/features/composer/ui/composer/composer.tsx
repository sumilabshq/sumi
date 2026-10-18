import { createElement as h, useRef } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { useComposerDraft } from "../../lib/use-composer-draft.js";
import { useFitsDraft } from "../../lib/use-fits-draft.js";
import { useFocusesWhen } from "../../lib/use-focuses-when.js";
import { useTakesPrefill } from "../../lib/use-takes-prefill.js";
import { AddFilesButton } from "./add-files-button.js";
import { AttachedChip } from "./attached-change.js";
import type { Attached } from "./attached-change.js";
import { DraftAttachments } from "./draft-attachments.js";

export interface ComposerProps {
	readonly busy: boolean;
	readonly attached: Attached | null;
	readonly onSend: (said: string) => Promise<boolean>;
	readonly onStop: () => void;
	readonly onTyped: () => void;
}

const PLACEHOLDER = "Ask for a screen, a widget, or a change to this note.";
const SEND = "Send";
const STOP = "Stop";
const OWN_RISK = "AI can make mistakes. It edits your files, and you take on whatever it changes.";

export function Composer({ busy, attached, onSend, onStop, onTyped }: ComposerProps): ReactElement {
	const composerBox = useRef<HTMLTextAreaElement>(null);
	const { draft, state, sendDraft, onChange, onKeyDown, onPaste, fill } = useComposerDraft({ busy, onSend, onTyped });
	useFitsDraft(composerBox, draft);
	useFocusesWhen(composerBox, attached?.label ?? null);
	useTakesPrefill(composerBox, fill);
	return (
		<div className="wg-studio-ai-composer">
			<p className="wg-studio-ai-risk">{OWN_RISK}</p>
			<div className="wg-studio-ai-well" onClick={(event) => focusBox(event, composerBox.current)}>
				<DraftAttachments />
				<textarea
					ref={composerBox}
					className="wg-studio-ai-box"
					rows={1}
					value={draft}
					placeholder={PLACEHOLDER}
					onChange={onChange}
					onKeyDown={onKeyDown}
					onPaste={onPaste}
				/>
				<div className="wg-studio-ai-bar">
					<AddFilesButton />
					{attached ? <AttachedChip attached={attached} /> : null}
					<IconButton
						variant={state === "idle" ? "neutral" : "accent"}
						size="s"
						disabled={state === "idle"}
						aria-label={state === "streaming" ? STOP : SEND}
						onClick={() => (state === "streaming" ? onStop() : sendDraft())}
					>
						<Icon name={state === "streaming" ? "stop" : "arrow-up"} />
					</IconButton>
				</div>
			</div>
		</div>
	);
}

function focusBox(event: MouseEvent<HTMLDivElement>, box: HTMLTextAreaElement | null): void {
	if (event.target instanceof Element && event.target.closest("button, textarea, input")) return;
	box?.focus();
}
