import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ChatPart } from "../chat-part/chat-part.js";
import { EmptyChat } from "../empty-chat/empty-chat.js";

export function NoTurns(): ReactElement {
	return (
		<ChatPart>
			<EmptyChat />
		</ChatPart>
	);
}
