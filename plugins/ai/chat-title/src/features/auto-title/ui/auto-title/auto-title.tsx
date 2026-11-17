import type { ReactElement } from "react";
import type { ComposerInput } from "@sumi/chat-plugin";
import { useAutoTitle } from "../../lib/use-auto-title.js";

export interface AutoTitleProps {
	readonly input: ComposerInput;
}

export function AutoTitle({ input }: AutoTitleProps): ReactElement | null {
	useAutoTitle(input.chatId);
	return null;
}
