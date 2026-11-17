import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "@widgetarium/kit";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import type { QueuedShown } from "@widgetarium/assistant/contract";
import { useSetsDraftAside } from "../../lib/use-sets-draft-aside.js";
import { useComposerDraft } from "../../lib/use-composer-draft.js";
import { useFitsDraft } from "../../lib/use-fits-draft.js";
import { useFocusesWhen } from "../../lib/use-focuses-when.js";
import { useTakesPrefill } from "../../lib/use-takes-prefill.js";
import { useComposerInput } from "../../../../shared/lib/composer-input.js";
import { AttachedChip } from "./attached-change.js";
import type { Attached } from "./attached-change.js";
import { ComposerTools } from "./composer-tools.js";
import { DraftAttachments } from "./draft-attachments.js";
import { useFocusesFromChat } from "../../lib/use-focuses-from-chat.js";
import { SendButton } from "./send-button.js";

export interface ComposerProps {
	readonly busy: boolean;
	readonly strip?: ReactNode;
	readonly isFirst: boolean;
	readonly attached: Attached | null;
	readonly onSend: (said: string) => Promise<boolean>;
	readonly onStop: () => void;
	readonly onTyped: () => void;
	readonly editing: QueuedShown | null;
	readonly onSaveEdit: (id: string, said: string) => Promise<boolean>;
	readonly onCancelEdit: () => void;
}

const FIRST_PLACEHOLDER = "Describe what to build or change ↵ send ⇧↵ new line / commands";
const NEXT_PLACEHOLDER = "Ask for the next change ↵ send ⇧↵ new line";
const BUSY_PLACEHOLDER = "Add to the queue ↵ queues it";
const EDIT_PLACEHOLDER = "Edit the queued message";
const EDITING = "Editing a queued message";
const EDIT_SAVES = "· ↵ saves it in its place, your draft comes back after";
const EDIT_KEEPS_IMAGES = "· its {count} attached stay with it";
const CANCEL = "Cancel";

export function Composer({
	busy,
	strip = null,
	isFirst,
	attached,
	onSend,
	onStop,
	onTyped,
	editing,
	onSaveEdit,
	onCancelEdit,
}: ComposerProps): ReactElement {
	const composer = useRef<HTMLDivElement>(null);
	const composerBox = useRef<HTMLTextAreaElement>(null);
	const field = useRef<HTMLDivElement>(null);
	const sendOrSave = editing === null ? onSend : (said: string) => onSaveEdit(editing.id, said);
	const { draft, state, sendDraft, onChange, onKeyDown, onPaste, fill } = useComposerDraft({
		busy,
		onSend: sendOrSave,
		onTyped,
	});
	useSetsDraftAside(editing, { draft, fill, composerBox });
	const fitBox = useFitsDraft(composerBox, draft);
	useFocusesWhen(composerBox, attached?.label ?? null);
	useTakesPrefill(composerBox, fill);
	const { input, takesKey, isBoxTextHidden, hint } = useComposerInput({ draft, fill, box: composerBox, field });
	useFocusesFromChat(composerBox);
	return (
		<div className="wg-studio-ai-composer" ref={composer}>
			<div ref={field} className={fieldClassOf(busy)}>
				{editing === null ? null : (
					<div className="wg-studio-ai-edit-bar">
						<Icon name="pencil" size={13} />
						<b>{EDITING}</b>
						<span>{editNoteOf(editing)}</span>
						<button type="button" className="wg-studio-ai-edit-cancel" onClick={onCancelEdit}>
							{CANCEL}
						</button>
					</div>
				)}
				<DraftAttachments />
				{attached ? <AttachedChip attached={attached} /> : null}
				<div className="wg-studio-ai-box-frame">
					<textarea
						ref={composerBox}
						className={isBoxTextHidden ? "wg-studio-ai-box is-text-hidden" : "wg-studio-ai-box"}
						rows={1}
						value={draft}
						placeholder={placeholderOf({ isFirst, busy, isEditing: editing !== null, hint })}
						onChange={onChange}
						onKeyDown={(event) => {
							if (takesKey(event)) {
								event.preventDefault();
								return;
							}

							if (editing !== null && event.key === "Escape") {
								onCancelEdit();
								return;
							}

							onKeyDown(event);
						}}
						onPaste={onPaste}
					/>
					<ListPluginSlot name="chat.composer-input" props={{ input }} />
					<ListPluginSlot name="chat.composer-bar" props={{ composer, box: composerBox, fitBox }} />
				</div>
				<div className="wg-studio-ai-field-bar">
					<ComposerTools />
					{strip ?? <span className="wg-studio-ai-bar-space" />}
					<SendButton state={state} isEditing={editing !== null} onSend={sendDraft} onStop={onStop} />
				</div>
			</div>
		</div>
	);
}

function fieldClassOf(busy: boolean): string {
	return busy ? "wg-studio-ai-field is-working" : "wg-studio-ai-field";
}

function placeholderOf({
	isFirst,
	busy,
	isEditing,
	hint,
}: {
	readonly isFirst: boolean;
	readonly busy: boolean;
	readonly isEditing: boolean;
	readonly hint: string | null;
}): string {
	if (isEditing) {
		return EDIT_PLACEHOLDER;
	}

	if (busy) {
		return BUSY_PLACEHOLDER;
	}

	if (hint !== null) {
		return hint;
	}

	return isFirst ? FIRST_PLACEHOLDER : NEXT_PLACEHOLDER;
}

function editNoteOf(editing: QueuedShown): string {
	if (editing.attached.length === 0) {
		return EDIT_SAVES;
	}

	return EDIT_KEEPS_IMAGES.replace("{count}", String(editing.attached.length));
}
