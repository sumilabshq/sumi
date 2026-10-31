import { Fragment, createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import { ChatFollower } from "../../../app-host/ui/chat-follower/chat-follower.js";
import { CloseShortcut } from "../../../app-host/ui/close-shortcut/close-shortcut.js";
import { NewTabShortcut } from "../../../app-host/ui/new-tab-shortcut/new-tab-shortcut.js";
import { ReopenShortcut } from "../../../app-host/ui/reopen-shortcut/reopen-shortcut.js";

export function SidebarKeys({ column }: { readonly column: RefObject<HTMLElement | null> }): ReactElement {
	return (
		<>
			<ChatFollower />
			<CloseShortcut frame={column} />
			<NewTabShortcut frame={column} />
			<ReopenShortcut frame={column} />
		</>
	);
}
