import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import { OpenNewChatCommand } from "@widgetarium/app-host";

const NEW_CHAT = "New chat";
const ROW_ICON_PX = 16;

export function NewChat(): ReactElement {
	const openNewChat = useCommand(OpenNewChatCommand);
	return (
		<Button
			variant="ghost"
			className="wg-ws-line-row is-new"
			onClick={() => void openNewChat.run({ title: null })}
			data-ws-new-chat=""
		>
			<Icon name="square-pen" size={ROW_ICON_PX} />
			<span className="wg-ws-row-title">{NEW_CHAT}</span>
		</Button>
	);
}
