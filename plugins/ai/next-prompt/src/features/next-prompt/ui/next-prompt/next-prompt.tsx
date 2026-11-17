import type { ReactElement } from "react";
import type { ComposerInput } from "@sumi/chat-plugin";
import { useNextPrompt } from "../../lib/use-next-prompt.js";

export interface NextPromptProps {
	readonly input: ComposerInput;
}

export function NextPrompt({ input }: NextPromptProps): ReactElement | null {
	useNextPrompt(input);
	return null;
}
