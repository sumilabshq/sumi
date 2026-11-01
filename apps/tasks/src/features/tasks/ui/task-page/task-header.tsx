import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PlateHeaderPart } from "../../../plate/ui/plate-header-part.js";
import { chatLinkOf } from "./chat-link.js";
import { NarrowControls } from "./narrow-controls.js";
import { OpenChatButton } from "./open-chat-button.js";

export interface TaskHeaderProps {
	readonly owner: string | null;
	readonly isNarrow: boolean;
}

export function TaskHeader({ owner, isNarrow }: TaskHeaderProps): ReactElement {
	const chatLink = owner === null ? null : chatLinkOf(owner);
	return (
		<PlateHeaderPart place="controls">
			{isNarrow ? <NarrowControls chatLink={chatLink} /> : <OpenChatButton chatLink={chatLink} />}
		</PlateHeaderPart>
	);
}
