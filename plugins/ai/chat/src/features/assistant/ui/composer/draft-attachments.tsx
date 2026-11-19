import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { useOverflowsAcross } from "../../lib/use-overflows-across.js";
import { AttachmentCard } from "./attachment-card.js";
import { AttachmentsMore } from "./attachments-more.js";
import { assistant } from "@widgetarium/assistant/contract";
import { useChatKey } from "../../../../shared/lib/chat-key-context.js";
import { PICTURE_GROUP_MARKS } from "../../../../shared/lib/picture-marks.js";

export function DraftAttachments(): ReactElement | null {
	const chat = useChatKey();
	const { data: drafts } = useQuery(assistant.composer.draftAttachments, { chat });
	const remove = useCommand(assistant.composer.removeAttachment);
	const track = useRef<HTMLDivElement>(null);
	const across = useOverflowsAcross(track, drafts.length);

	if (drafts.length === 0) {
		return null;
	}

	return (
		<div
			className={`wg-studio-ai-attachments${across.overflows ? " is-over" : ""}`}
			data-draft-attachments=""
			{...PICTURE_GROUP_MARKS}
		>
			<div className="wg-studio-ai-attachments-track" ref={track} onScroll={across.onScroll}>
				{drafts.map((chip) => (
					<AttachmentCard
						key={chip.id}
						chip={chip}
						onRemove={() => void remove.run({ chat, id: chip.id })}
					/>
				))}
			</div>
			{across.overflows ? <AttachmentsMore drafts={drafts} seen={across.seen} onMore={across.pageOn} /> : null}
		</div>
	);
}
