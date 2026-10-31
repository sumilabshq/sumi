import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { ChatLink } from "./chat-link.js";

export interface ChatLinksProps {
	readonly chatIds: readonly string[];
}

export function ChatLinks({ chatIds }: ChatLinksProps): ReactElement {
	return (
		<span>
			{chatIds.map((chatId, at) => (
				<Fragment key={chatId}>
					{at === 0 ? null : ", "}
					<ChatLink chatId={chatId} />
				</Fragment>
			))}
		</span>
	);
}
