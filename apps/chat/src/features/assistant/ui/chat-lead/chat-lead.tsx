import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface ChatLeadProps {
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
}

export function ChatLeadHead({ lead, title }: ChatLeadProps): ReactElement | null {
	if (lead === undefined || lead === null) {
		return null;
	}

	return (
		<header className="wg-studio-ai-head">
			<span className="wg-studio-ai-named">{title ? <span className="wg-studio-ai-title">{title}</span> : null}</span>
			{lead}
		</header>
	);
}
