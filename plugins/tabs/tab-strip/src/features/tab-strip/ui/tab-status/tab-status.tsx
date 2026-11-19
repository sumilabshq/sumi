import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ChatMark } from "@widgetarium/app-host/contract";

type ShownMark = Exclude<ChatMark, "none" | "running">;

const SAID: Readonly<Record<ShownMark, string>> = {
	asking: "Waiting for you",
	failed: "Failed",
	unread: "Done, not read",
};

export function TabStatus({ mark }: { readonly mark: ChatMark }): ReactElement | null {
	if (mark === "none" || mark === "running") {
		return null;
	}

	return <span className="sumi-tab-status" data-mark={mark} role="img" aria-label={SAID[mark]} />;
}
