import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface ChatLeadProps {
	readonly lead: ReactNode;
}

export function ChatLeadHead({ lead }: ChatLeadProps): ReactElement | null {
	if (lead === null || lead === undefined) {
		return null;
	}

	return h("header", { className: "wg-studio-ai-head" }, lead);
}
