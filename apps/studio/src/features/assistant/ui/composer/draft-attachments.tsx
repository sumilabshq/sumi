import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/framework";
import { useOverflowsAcross } from "../../lib/use-overflows-across.js";
import { hasPreview, isPicture, useOpensPictures } from "../../lib/use-opens-pictures.js";
import { AttachmentCard } from "./attachment-card.js";
import { AttachmentsMore } from "./attachments-more.js";
import { DraftAttachmentsQuery, RemoveAttachmentCommand } from "@widgetarium/assistant";

export function DraftAttachments(): ReactElement | null {
	const { data: drafts } = useQuery(DraftAttachmentsQuery);
	const remove = useCommand(RemoveAttachmentCommand);
	const track = useRef<HTMLDivElement>(null);
	const across = useOverflowsAcross(track, drafts.length);
	const { holder, open, viewer } = useOpensPictures<HTMLDivElement>(drafts.filter(isPicture));

	if (drafts.length === 0) {
		return null;
	}

	return (
		<div
			className={`wg-studio-ai-attachments${across.overflows ? " is-over" : ""}`}
			ref={holder}
			data-draft-attachments=""
		>
			<div className="wg-studio-ai-attachments-track" ref={track} onScroll={across.onScroll}>
				{drafts.map((chip) => (
					<AttachmentCard
						key={chip.id}
						chip={chip}
						onOpen={isPicture(chip) && hasPreview(chip) ? () => open(chip) : undefined}
						onRemove={() => void remove.run({ id: chip.id })}
					/>
				))}
			</div>
			{viewer}
			{across.overflows ? <AttachmentsMore drafts={drafts} seen={across.seen} onMore={across.pageOn} /> : null}
		</div>
	);
}
