import { Fragment, createElement as h } from "react";
import { Mascot } from "@widgetarium/mascot";
import type { ReactElement, ReactNode } from "react";

export interface ChatLeadProps {
	readonly lead: ReactNode;
	readonly title?: string | undefined;
}

export const CHAT_MASCOT_PX = 36;

export function ChatLeadHead({ lead, title }: ChatLeadProps): ReactElement {
	return h("header", { className: "wg-studio-ai-head" }, [
		h(Mascot, { key: "mascot", size: CHAT_MASCOT_PX }),
		h(
			"span",
			{ className: "wg-studio-ai-named", key: "named" },
			title ? h("span", { className: "wg-studio-ai-title" }, title) : null,
		),
		lead ? h(Fragment, { key: "lead" }, lead) : null,
	]);
}
