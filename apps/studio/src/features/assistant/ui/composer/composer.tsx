import { createElement as h, useRef, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { useComposerDraft } from "../../lib/use-composer-draft.js";
import { useFitsDraft } from "../../lib/use-fits-draft.js";
import { useFocusesWhen } from "../../lib/use-focuses-when.js";
import { useTakesPrefill } from "../../lib/use-takes-prefill.js";
import { useSlashMenu } from "../../lib/use-slash-menu.js";
import { SlashMenu } from "../slash-menu/slash-menu.js";
import { AttachedChip } from "./attached-change.js";
import type { Attached } from "./attached-change.js";
import { ComposerTools } from "./composer-tools.js";
import { DraftAttachments } from "./draft-attachments.js";
import { SendButton } from "./send-button.js";
import { STARTER_FACES, StarterChip } from "./starter-chip.js";
import { ComposerStarterQuery, DropStarterCommand } from "@widgetarium/assistant";

export interface ComposerProps {
	readonly busy: boolean;
	readonly strip?: ReactNode;
	readonly attached: Attached | null;
	readonly onSend: (said: string) => Promise<boolean>;
	readonly onStop: () => void;
	readonly onTyped: () => void;
}

const PLACEHOLDER = "Describe what to build or change";
const NEW_LINE = "new line";

export function Composer({ busy, strip = null, attached, onSend, onStop, onTyped }: ComposerProps): ReactElement {
	const composerBox = useRef<HTMLTextAreaElement>(null);
	const [isFocused, setFocused] = useState(false);
	const { data: starter } = useQuery(ComposerStarterQuery);
	const dropStarter = useCommand(DropStarterCommand);
	const { draft, state, sendDraft, onChange, onKeyDown, onPaste, fill } = useComposerDraft({ busy, onSend, onTyped });
	useFitsDraft(composerBox, draft);
	useFocusesWhen(composerBox, attached?.label ?? starter);
	useTakesPrefill(composerBox, fill);
	const slash = useSlashMenu({ draft, fill, box: composerBox });
	return (
		<div className="wg-studio-ai-composer">
			<SlashMenu slash={slash} draft={draft} />
			<DraftAttachments />
			<div
				className={`wg-studio-ai-field${isFocused ? " is-focused" : ""}`}
				onClick={(event) => focusBox(event, composerBox.current)}
			>
				{starter === null ? null : <StarterChip starter={starter} onDrop={() => void dropStarter.run()} />}
				{attached ? <AttachedChip attached={attached} /> : null}
				<textarea
					ref={composerBox}
					className="wg-studio-ai-box"
					rows={1}
					value={draft}
					placeholder={starter === null ? PLACEHOLDER : STARTER_FACES[starter].asks}
					onChange={onChange}
					onKeyDown={(event) => {
						if (!slash.takesKey(event)) {
							onKeyDown(event);
						}
					}}
					onPaste={onPaste}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
				/>
				<div className="wg-studio-ai-field-bar">
					<ComposerTools />
					<span className="wg-studio-ai-bar-space" />
					{state === "typing" ? (
						<span className="wg-studio-ai-hint">
							<kbd>⇧</kbd>
							<kbd>⏎</kbd>
							{NEW_LINE}
						</span>
					) : null}
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
