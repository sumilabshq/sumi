import { createElement as h } from "react";
import type { ReactElement } from "react";
import { navigation } from "@sumi/contract";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { ChatOfTab } from "./chat-of-tab.js";

export function ChatRoot({ tabId }: TabPageProps): ReactElement {
	const tab = useOptionalQuery(navigation.tabFacts.ownAppTab, {
		id: tabId,
	});
	return (
		<div className="wg-chat-app" data-sumi-corner="fade">
			<ChatOfTab tab={tab} />
		</div>
	);
}
