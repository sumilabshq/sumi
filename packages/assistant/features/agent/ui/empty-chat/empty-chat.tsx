import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { AgentSetupQuery } from "../../contract.js";
import { NoProviderChat } from "./no-provider-chat.js";
import { ReadyEmptyChat } from "./ready-empty-chat.js";

export function EmptyChat(): ReactElement {
	const { data: setup } = useQuery(AgentSetupQuery);

	if (setup.isReady) {
		return <ReadyEmptyChat />;
	}

	return <NoProviderChat label={setup.providerLabel} />;
}
