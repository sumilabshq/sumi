import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { sizeSaid } from "../../lib/size-said.js";
import type { AttachmentChip } from "@widgetarium/assistant";

export interface AttachmentsMoreProps {
	readonly drafts: readonly AttachmentChip[];
	readonly seen: number;
	readonly onMore: () => void;
}

const SHOW_MORE = "Show more";
const COUNT = "{count} files · {size}";

export function AttachmentsMore({ drafts, seen, onMore }: AttachmentsMoreProps): ReactElement {
	const size = sizeSaid(drafts.reduce((sum, chip) => sum + chip.bytes, 0));
	return (
		<>
			<button type="button" className="wg-studio-ai-attachments-more" aria-label={SHOW_MORE} onClick={onMore}>
				<Icon name="chevron-right" size={16} />
			</button>
			<div className="wg-studio-ai-attachments-meta">
				<span className="wg-studio-ai-attachments-bar">
					<i style={{ width: `${Math.round(seen * 100)}%` }} />
				</span>
				<span>{COUNT.replace("{count}", String(drafts.length)).replace("{size}", size)}</span>
			</div>
		</>
	);
}
