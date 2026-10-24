import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { ChatCrumbQuery } from "@widgetarium/workspaces";

export function ChatCrumb(): ReactElement {
	const { workspace, chat } = useQuery(ChatCrumbQuery).data;
	return (
		<span className="wg-ws-crumb" data-ws-crumb="">
			<span className="wg-ws-crumb-workspace">{workspace}</span>
			<span className="wg-ws-crumb-slash" aria-hidden="true">
				/
			</span>
			<span className="wg-ws-crumb-chat">{chat}</span>
		</span>
	);
}
