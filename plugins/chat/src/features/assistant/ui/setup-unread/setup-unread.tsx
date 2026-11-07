import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { ChatLeadHead } from "../chat-lead/chat-lead.js";

export interface SetupUnreadProps {
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
}

export function SetupUnread({ lead, title }: SetupUnreadProps): ReactElement {
	return (
		<div className="wg-studio-ai">
			<ChatLeadHead lead={lead} title={title} />
		</div>
	);
}
