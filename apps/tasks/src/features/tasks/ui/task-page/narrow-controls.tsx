import { createElement as h } from "react";
import type { ReactElement } from "react";
import { HeaderButton } from "../../../plate/ui/header-button.js";
import { OPEN_CHAT } from "./open-chat-button.js";
import type { OpenChatButtonProps } from "./open-chat-button.js";

export function NarrowControls({ chatLink }: OpenChatButtonProps): ReactElement | null {
	if (chatLink === null) {
		return null;
	}

	return <HeaderButton label={OPEN_CHAT} icon="message-square" data-tasks-open-chat="" href={chatLink} />;
}
