import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ChatLeadProps } from "./chat-lead.js";

export function BareLead({ lead }: Pick<ChatLeadProps, "lead">): ReactElement | null {
	if (lead === undefined || lead === null) {
		return null;
	}

	return <header className="wg-studio-ai-head is-bare">{lead}</header>;
}
