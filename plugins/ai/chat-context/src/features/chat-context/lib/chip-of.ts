import type { ChatContext } from "@sumi/chat-context/contract";

export function chipOf(context: ChatContext | null): string | null {
	return context?.branch ?? null;
}
