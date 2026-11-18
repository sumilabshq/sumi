import { createElement as h } from "react";
import type { ReactElement } from "react";
import { navigation } from "@sumi/contract";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import { useAlignsWithWindowControls } from "../../lib/use-aligns-with-window-controls.js";
import { ChatOfTab } from "./chat-of-tab.js";

export function ChatRoot({ tabId }: TabPageProps): ReactElement {
	const corner = useAlignsWithWindowControls();
	const tab = useOptionalQuery(navigation.tabFacts.ownAppTab, {
		id: tabId,
	});
	return (
		<div className="wg-chat-app" data-sumi-corner="fade">
			<ChatOfTab tab={tab} />
			<div className="wg-chat-top-start" ref={corner}>
				<div className="wg-root wg-chat-top-start-row">
					<ListPluginSlot name="chat.top-start" props={{ chatId: tab.data?.chatId ?? null }} />
				</div>
			</div>
		</div>
	);
}
