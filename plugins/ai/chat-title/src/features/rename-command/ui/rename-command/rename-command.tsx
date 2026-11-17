import type { ReactElement } from "react";
import type { ComposerInput } from "@sumi/chat-plugin";
import { useRenameCommand } from "../../lib/use-rename-command.js";

export interface RenameCommandProps {
	readonly input: ComposerInput;
}

export function RenameCommand({ input }: RenameCommandProps): ReactElement | null {
	useRenameCommand(input);
	return null;
}
