import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { ChatState, SidebarTab } from "@widgetarium/app-host";
import { GroupBox } from "../group-box/group-box.js";
import { TabRow } from "../tab-row/tab-row.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";
import type { RowBadge } from "../tab-row/row-badge.js";

export interface ChatEntryProps {
	readonly chat: ChatState;
	readonly groupId: string | null;
	readonly renaming: RowRenaming;
	readonly badge?: RowBadge | null;
}

const CHILDREN = "cv:flex cv:flex-col cv:gap-px cv:empty:hidden";

export function ChatEntry({ chat, groupId, renaming, badge = null }: ChatEntryProps): ReactElement {
	const childOf = (child: SidebarTab, childGroupId: string | null): ReactElement => (
		<TabRow
			key={child.tab.id}
			item={child}
			groupId={childGroupId}
			place="child"
			isRenaming={renaming.id === child.tab.id}
			onRenamed={renaming.onRenamed}
		/>
	);
	return (
		<Fragment>
			<TabRow
				item={{ kind: "chat", chat }}
				groupId={groupId}
				place="top"
				isRenaming={renaming.id === chat.id}
				onRenamed={renaming.onRenamed}
				badge={badge}
			/>
			<div className={CHILDREN} data-tabs-list={chat.id} data-tabs-in={chat.id} data-tabs-nested="">
				{chat.children.map((child) =>
					child.kind === "tab" ? (
						childOf(child, null)
					) : (
						<GroupBox
							key={child.group.id}
							id={child.group.id}
							name={child.group.name}
							hue={child.group.hue}
							isOpen={child.group.isOpen}
							count={child.group.tabs.length}
						>
							{child.group.tabs.map((tab) => childOf({ kind: "tab", tab }, child.group.id))}
						</GroupBox>
					),
				)}
			</div>
		</Fragment>
	);
}
