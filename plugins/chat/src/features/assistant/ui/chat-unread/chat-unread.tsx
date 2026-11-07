import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { ChatLeadHead } from "../chat-lead/chat-lead.js";
import { FailureSaid } from "../failure-said/failure-said.js";

export interface ChatUnreadProps {
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
	readonly reason: string;
}

const NOT_READ = "The chat could not be read: {why}";

export function ChatUnread({ lead, title, reason }: ChatUnreadProps): ReactElement {
	return (
		<div className="wg-root wg-studio-ai-host">
			<div className="wg-studio-ai">
				<ChatLeadHead lead={lead} title={title} />
				<FailureSaid failure={NOT_READ.replace("{why}", reason)} />
			</div>
		</div>
	);
}
