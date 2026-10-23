import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Slot } from "@widgetarium/core/requests";
import { ChatList } from "../../../features/chats/ui/chat-list/chat-list.js";
import { NewChat } from "../../../features/chats/ui/new-chat/new-chat.js";
import { WorkspaceHeader } from "../../../features/workspaces/ui/workspace-header/workspace-header.js";
import { WorkspaceKeys } from "../../../features/workspaces/ui/workspace-keys/workspace-keys.js";
import { WorkspaceStrip } from "../../../features/workspaces/ui/workspace-strip/workspace-strip.js";
import { ColumnFoot } from "./column-foot.js";
import { ColumnTop } from "./column-top.js";
import { OpeningVeil } from "./opening-veil.js";

const COLUMN_LABEL = "Chats";

export function ChatsColumn(): ReactElement {
	return (
		<nav className="wg-ws-column wg-root" aria-label={COLUMN_LABEL} data-ws-column="">
			<Slot loading={null}>
				<OpeningVeil>
					<ColumnTop />
					<WorkspaceHeader />
					<NewChat />
					<div className="wg-ws-scroll">
						<ChatList />
					</div>
					<ColumnFoot />
				</OpeningVeil>
				<WorkspaceStrip />
				<WorkspaceKeys />
			</Slot>
		</nav>
	);
}
