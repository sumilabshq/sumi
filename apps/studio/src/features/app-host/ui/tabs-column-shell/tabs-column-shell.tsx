import { Fragment, createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import { Slot } from "@widgetarium/core/requests";
import { TabsColumn } from "../tabs-column/tabs-column.js";
import { ChatFollower } from "../chat-follower/chat-follower.js";
import { CloseShortcut } from "../close-shortcut/close-shortcut.js";
import { NewTabShortcut } from "../new-tab-shortcut/new-tab-shortcut.js";
import { ReopenShortcut } from "../reopen-shortcut/reopen-shortcut.js";
import { TabsSidebar } from "../tabs-sidebar/tabs-sidebar.js";

export function TabsColumnShell({ frame }: { readonly frame: RefObject<HTMLElement | null> }): ReactElement {
	return (
		<>
			<Slot loading={null}>
				<TabsColumn>
					<Slot loading={null}>
						<TabsSidebar />
					</Slot>
				</TabsColumn>
			</Slot>
			<Slot loading={null}>
				<ChatFollower />
				<CloseShortcut frame={frame} />
				<NewTabShortcut frame={frame} />
				<ReopenShortcut frame={frame} />
			</Slot>
		</>
	);
}
