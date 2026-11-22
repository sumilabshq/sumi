import { sandboxGrantsOf } from "@sumi/agent-tools/sandbox";
import { Authenticate } from "@widgetarium/data-framework";
import type { User } from "@widgetarium/data-framework";

const CHAT_HEADER = "sumi-chat";

export class AgentCallAuthenticate extends Authenticate {
	userOf(headers: Headers): Promise<User | null> {
		const chat = headers.get(CHAT_HEADER);
		return Promise.resolve(chat === null || chat === "" ? null : { id: chat, permissions: sandboxGrantsOf(headers) });
	}
}
