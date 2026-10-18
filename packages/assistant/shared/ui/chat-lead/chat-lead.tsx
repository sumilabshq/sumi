import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Mascot } from "@widgetarium/mascot";

export interface ChatLeadProps {
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
}

export const CHAT_MASCOT_PX = 40;

export function ChatLeadHead({ lead, title }: ChatLeadProps): ReactElement {
	return (
		<header className="wg-studio-ai-head">
			<Mascot size={CHAT_MASCOT_PX} />
			<span className="wg-studio-ai-named">{title ? <span className="wg-studio-ai-title">{title}</span> : null}</span>
			{lead ?? null}
		</header>
	);
}
