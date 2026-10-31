import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";

export interface OpenChatButtonProps {
	readonly chatLink: string | null;
}

export const OPEN_CHAT = "Open chat";

export function OpenChatButton({ chatLink }: OpenChatButtonProps): ReactElement | null {
	if (chatLink === null) {
		return null;
	}

	return (
		<Button asChild variant="ghost" size="s" data-tasks-open-chat="">
			<a href={chatLink}>{OPEN_CHAT}</a>
		</Button>
	);
}
