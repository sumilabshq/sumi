import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { QueuedShown } from "@widgetarium/assistant";
import type { QueueActions } from "../../lib/use-queue-actions.js";
import { QueuedMessage } from "./queued-message.js";

export interface QueueZoneProps {
	readonly queued: readonly QueuedShown[];
	readonly isBusy: boolean;
	readonly actions: QueueActions;
	readonly onEdit: (queued: QueuedShown) => void;
}

const LABEL = "Queued messages";
const COUNT = "Queued · {count}";
const WHEN_BUSY = "· sent at Sumi’s next step";
const WHEN_IDLE = "· waiting for you";
const SEND_NOW = "Send now";
const HIDE = "Hide the queue";
const SHOW = "Show the queue";
const FOLDED = "{count} queued";
const IMAGES_ONLY = "{count} image";

export function QueueZone({ queued, isBusy, actions, onEdit }: QueueZoneProps): ReactElement | null {
	const [isOpen, setOpen] = useState(true);
	const first = queued[0];

	if (first === undefined) {
		return null;
	}

	if (!isOpen) {
		return (
			<button type="button" className="wg-studio-ai-queue-fold" aria-label={SHOW} onClick={() => setOpen(true)}>
				<Icon name="chevron-up" size={14} />
				<b>{FOLDED.replace("{count}", String(queued.length))}</b>
				<span>{`· ${previewOf(first)}`}</span>
			</button>
		);
	}

	const isEditing = queued.some(({ isHeld }) => isHeld);
	const canSendNow = queued.some(({ isHeld }) => !isHeld);
	return (
		<section className="wg-studio-ai-queue" aria-label={LABEL}>
			<header className="wg-studio-ai-queue-head">
				<b>{COUNT.replace("{count}", String(queued.length))}</b>
				<span className="wg-studio-ai-queue-when">{isBusy ? WHEN_BUSY : WHEN_IDLE}</span>
				<button type="button" className="wg-studio-ai-queue-send" disabled={!canSendNow} onClick={actions.sendNow}>
					{SEND_NOW}
				</button>
				<button type="button" className="wg-studio-ai-queue-hide" aria-label={HIDE} onClick={() => setOpen(false)}>
					<Icon name="chevron-down" size={14} />
				</button>
			</header>
			<div className="wg-studio-ai-queue-list">
				{queued.map((message) => (
					<QueuedMessage
						key={message.id}
						queued={message}
						canEdit={!isEditing}
						onEdit={() => onEdit(message)}
						onRemove={() => actions.remove(message.id)}
					/>
				))}
			</div>
		</section>
	);
}

function previewOf(queued: QueuedShown): string {
	if (queued.said !== "") {
		return queued.said;
	}

	return IMAGES_ONLY.replace("{count}", String(queued.attached.length));
}
