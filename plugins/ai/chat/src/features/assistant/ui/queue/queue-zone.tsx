import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { QueuedShown } from "@widgetarium/assistant/contract";
import type { QueueActions } from "../../lib/use-queue-actions.js";
import { QueuedMessage } from "./queued-message.js";

export interface QueueZoneProps {
	readonly queued: readonly QueuedShown[];
	readonly actions: QueueActions;
	readonly onEdit: (queued: QueuedShown) => void;
}

const LABEL = "Queued messages";
const SEND_NOW = "Send now";

export function QueueZone({ queued, actions, onEdit }: QueueZoneProps): ReactElement | null {
	if (queued.length === 0) {
		return null;
	}

	const isEditing = queued.some(({ isHeld }) => isHeld);
	const canSendNow = queued.some(({ isHeld }) => !isHeld);
	return (
		<section className="wg-studio-ai-queue" aria-label={LABEL}>
			{queued.map((message) => (
				<QueuedMessage
					key={message.id}
					queued={message}
					canEdit={!isEditing}
					onEdit={() => onEdit(message)}
					onRemove={() => actions.remove(message.id)}
				/>
			))}
			<button type="button" className="wg-studio-ai-queue-send" disabled={!canSendNow} onClick={actions.sendNow}>
				{SEND_NOW}
			</button>
		</section>
	);
}
