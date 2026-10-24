import { createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import { Slot } from "@widgetarium/core/requests";
import { TabsColumn } from "../../../features/column/ui/tabs-column/tabs-column.js";
import { ChatFollower } from "../../../features/tabs/ui/chat-follower/chat-follower.js";
import { CloseShortcut } from "../../../features/tabs/ui/close-shortcut/close-shortcut.js";
import { NewTabShortcut } from "../../../features/tabs/ui/new-tab-shortcut/new-tab-shortcut.js";
import { ReopenShortcut } from "../../../features/tabs/ui/reopen-shortcut/reopen-shortcut.js";
import { TabsSidebar } from "../tabs-sidebar/tabs-sidebar.js";

export function TabsColumnShell({ frame }: { readonly frame: RefObject<HTMLElement | null> }): ReactElement {
	return (
		<Slot loading={null}>
			<TabsColumn>
				<TabsSidebar />
			</TabsColumn>
			<ChatFollower />
			<CloseShortcut frame={frame} />
			<NewTabShortcut frame={frame} />
			<ReopenShortcut frame={frame} />
		</Slot>
	);
}
