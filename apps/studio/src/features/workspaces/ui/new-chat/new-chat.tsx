import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import { CreateChatCommand } from "@widgetarium/workspaces";

const NEW_CHAT = "New chat";
const ROW_ICON_PX = 16;

export function NewChat(): ReactElement {
	const createChat = useCommand(CreateChatCommand);
	return (
		<Button variant="ghost" className="wg-ws-line-row is-new" onClick={() => void createChat.run()} data-ws-new-chat="">
			<Icon name="square-pen" size={ROW_ICON_PX} />
			<span className="wg-ws-row-title">{NEW_CHAT}</span>
		</Button>
	);
}
