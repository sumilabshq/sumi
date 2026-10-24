import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { ChatLeadHead } from "../chat-lead/chat-lead.js";

export interface SetupUnreadProps {
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
	readonly failure: string | null;
}

export function SetupUnread({ lead, title, failure }: SetupUnreadProps): ReactElement {
	return (
		<div className="wg-studio-ai">
			<ChatLeadHead lead={lead} title={title} />
			{failure === null ? null : <p className="wg-studio-ai-quiet">{failure}</p>}
		</div>
	);
}
