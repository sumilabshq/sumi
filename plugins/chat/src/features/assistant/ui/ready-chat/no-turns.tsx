import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ChatPart } from "../chat-part/chat-part.js";
import { EmptyChat } from "../empty-chat/empty-chat.js";
import { Starters } from "../starters/starters.js";

export function NoTurns(): ReactElement {
	return (
		<ChatPart>
			<EmptyChat starters={<Starters />} />
		</ChatPart>
	);
}
