import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ListPluginSlot, PluginSlot } from "@widgetarium/plugin-framework/react";

export function ChatHead({ chatId }: { readonly chatId: string }): ReactElement {
	return (
		<header className="wg-chat-head">
			<PluginSlot name="chat.head-title" props={{ chatId }} />
			<ListPluginSlot name="chat.head-tools" props={{ chatId }} />
		</header>
	);
}
