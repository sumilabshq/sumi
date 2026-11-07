import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { QueuedShown } from "@widgetarium/assistant";
import { isPicture } from "../../lib/use-opens-pictures.js";
import { SentAttachments } from "../turn/sent-attachments.js";
import { SentPictures } from "../turn/sent-pictures.js";
import { QueuedLine } from "./queued-line.js";
import { QueuedSaid } from "./queued-said.js";

export interface QueuedMessageProps {
	readonly queued: QueuedShown;
	readonly canEdit: boolean;
	readonly onEdit: () => void;
	readonly onRemove: () => void;
}

export function QueuedMessage({ queued, canEdit, onEdit, onRemove }: QueuedMessageProps): ReactElement {
	const pictures = queued.attached.filter(isPicture);
	const files = queued.attached.filter((chip) => !isPicture(chip));
	return (
		<div className={queued.isHeld ? "wg-studio-ai-queued is-held" : "wg-studio-ai-queued"}>
			{pictures.length > 0 ? <SentPictures pictures={pictures} /> : null}
			{queued.said === "" ? null : <QueuedSaid said={queued.said} />}
			{files.length > 0 ? <SentAttachments attached={files} /> : null}
			<QueuedLine isHeld={queued.isHeld} canEdit={canEdit} onEdit={onEdit} onRemove={onRemove} />
		</div>
	);
}
