import { createElement as h } from "react";
import type { ReactElement } from "react";
import { places } from "@sumi/contract";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { ChatOfTab } from "./chat-of-tab.js";

export function ChatRoot({ tabId }: TabPageProps): ReactElement {
	const tab = useOptionalQuery(places.tabFacts.ownAppTab, {
		id: tabId,
	});
	return (
		<div className="wg-chat-app">
			<ChatOfTab tab={tab} />
		</div>
	);
}
