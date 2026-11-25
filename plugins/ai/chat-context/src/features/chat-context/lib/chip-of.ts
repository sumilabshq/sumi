import type { ChatContext } from "@sumi/chat-context/contract";

export interface Chip {
	readonly icon: "git-branch" | "folder";
	readonly label: string;
}

export function chipOf(context: ChatContext | null): Chip | null {
	if (context === null) {
		return null;
	}

	if (context.branch !== null) {
		return { icon: "git-branch", label: context.branch };
	}

	return { icon: "folder", label: context.name };
}
