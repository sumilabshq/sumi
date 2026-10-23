import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ChatMarkKind } from "../../../../shared/schema/chat.schema.js";
import { RunningMark } from "./running-mark.js";
import { UnreadMark } from "./unread-mark.js";

export function ChatMark({ mark }: { readonly mark: ChatMarkKind }): ReactElement | null {
	if (mark === "unread") {
		return <UnreadMark />;
	}

	if (mark === "running") {
		return <RunningMark />;
	}

	return null;
}
