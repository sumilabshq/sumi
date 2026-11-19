import { createElement as h } from "react";
import type { ReactElement } from "react";
import { navigation } from "@sumi/contract";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { useAlignsWithWindowControls } from "../../lib/use-aligns-with-window-controls.js";
import { ChatOfTab } from "./chat-of-tab.js";

export function ChatRoot({ tabId }: TabPageProps): ReactElement {
	const chatApp = useAlignsWithWindowControls();
	const tab = useOptionalQuery(navigation.tabFacts.ownAppTab, {
		id: tabId,
	});
	return (
		<div className="wg-chat-app" data-sumi-corner="fade" ref={chatApp}>
			<ChatOfTab tab={tab} />
		</div>
	);
}
