import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { NoProviderChat } from "./no-provider-chat.js";
import { ReadyEmptyChat } from "./ready-empty-chat.js";
import { AgentSetupQuery } from "@widgetarium/assistant";
import { useChatKey } from "../../../../shared/lib/chat-key-context.js";

export function EmptyChat({ starters }: { readonly starters: ReactNode }): ReactElement {
	const { data: setup } = useQuery(AgentSetupQuery, { chat: useChatKey() });

	if (setup.isReady) {
		return <ReadyEmptyChat starters={starters} />;
	}

	return <NoProviderChat label={setup.providerLabel} />;
}
