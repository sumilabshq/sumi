import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface QueuedLineProps {
	readonly isHeld: boolean;
	readonly canEdit: boolean;
	readonly onEdit: () => void;
	readonly onRemove: () => void;
}

const QUEUED = "Queued";
const EDITING = "Editing in the composer · the rest can still go";
const EDIT = "Edit";
const REMOVE = "Remove";

export function QueuedLine({ isHeld, canEdit, onEdit, onRemove }: QueuedLineProps): ReactElement {
	if (isHeld) {
		return (
			<div className="wg-studio-ai-queued-line">
				<Icon name="pencil" size={13} />
				<span>{EDITING}</span>
			</div>
		);
	}

	return (
		<div className="wg-studio-ai-queued-line">
			<Icon name="clock" size={13} />
			<span className="wg-studio-ai-queued-state">{QUEUED}</span>
			<button type="button" className="wg-studio-ai-queued-act" disabled={!canEdit} onClick={onEdit}>
				<Icon name="pencil" size={13} />
				{EDIT}
			</button>
			<button type="button" className="wg-studio-ai-queued-act" onClick={onRemove}>
				<Icon name="trash" size={13} />
				{REMOVE}
			</button>
		</div>
	);
}
