import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { Icon } from "@widgetarium/kit";
import { chatTabs } from "@sumi/chat-tabs/contract";

const NEW_SESSION = "New session";
const ICON_PX = 16;

export function NewSessionRow(): ReactElement {
	const openNew = useCommand(chatTabs.chatOpening.openNew);
	return (
		<button type="button" className="sumi-new-chat-row" onClick={() => void openNew.run({ title: null })}>
			<Icon name="plus" size={ICON_PX} />
			<span>{NEW_SESSION}</span>
		</button>
	);
}
