import { Fragment, createElement as h } from "react";
import { Mascot } from "@widgetarium/mascot";
import type { ReactElement, ReactNode } from "react";

export interface ChatLeadProps {
	readonly lead: ReactNode;
}

export const CHAT_MASCOT_PX = 36;

export function ChatLeadHead({ lead }: ChatLeadProps): ReactElement {
	return h("header", { className: "wg-studio-ai-head" }, [
		h(Mascot, { key: "mascot", size: CHAT_MASCOT_PX }),
		lead ? h(Fragment, { key: "lead" }, lead) : null,
	]);
}
