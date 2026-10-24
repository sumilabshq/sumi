import { Fragment, createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { sizeSaid } from "../../lib/size-said.js";
import { useOverflowsAcross } from "../../lib/use-overflows-across.js";
import { AttachmentCard } from "./attachment-card.js";
import { DraftAttachmentsQuery, RemoveAttachmentCommand } from "@widgetarium/assistant";

const SHOW_MORE = "Show more";
const COUNT = "{count} files · {size}";

export function DraftAttachments(): ReactElement | null {
	const { data: drafts } = useQuery(DraftAttachmentsQuery);
	const remove = useCommand(RemoveAttachmentCommand);
	const track = useRef<HTMLDivElement>(null);
	const across = useOverflowsAcross(track, drafts.length);

	if (drafts.length === 0) {
		return null;
	}

	return (
		<div className={`wg-studio-ai-attachments${across.overflows ? " is-over" : ""}`} data-draft-attachments="">
			<div className="wg-studio-ai-attachments-track" ref={track} onScroll={across.onScroll}>
				{drafts.map((chip) => (
					<AttachmentCard key={chip.id} chip={chip} onRemove={() => void remove.run({ id: chip.id })} />
				))}
			</div>
			{across.overflows ? (
				<>
					<button
						type="button"
						className="wg-studio-ai-attachments-more"
						aria-label={SHOW_MORE}
						onClick={across.pageOn}
					>
						<Icon name="chevron-right" size={16} />
					</button>
					<div className="wg-studio-ai-attachments-meta">
						<span className="wg-studio-ai-attachments-bar">
							<i style={{ width: `${Math.round(across.seen * 100)}%` }} />
						</span>
						<span>
							{COUNT.replace("{count}", String(drafts.length)).replace(
								"{size}",
								sizeSaid(drafts.reduce((sum, chip) => sum + chip.bytes, 0)),
							)}
						</span>
					</div>
				</>
			) : null}
		</div>
	);
}
