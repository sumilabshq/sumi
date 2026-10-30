import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { GroupItem, SidebarEntry } from "@widgetarium/app-host";
import { GroupBox } from "../group-box/group-box.js";
import { TabRow } from "../tab-row/tab-row.js";
import { ChatEntry } from "./chat-entry.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";

export interface SidebarEntriesProps {
	readonly entries: readonly SidebarEntry[];
	readonly renaming: RowRenaming;
}

export function SidebarEntries({ entries, renaming }: SidebarEntriesProps): ReactElement {
	const itemOf = (item: GroupItem, groupId: string | null): ReactElement =>
		item.kind === "chat" ? (
			<ChatEntry key={item.chat.id} chat={item.chat} groupId={groupId} renaming={renaming} />
		) : (
			<TabRow
				key={item.tab.id}
				item={item}
				groupId={groupId}
				place="top"
				isRenaming={renaming.id === item.tab.id}
				onRenamed={renaming.onRenamed}
			/>
		);
	return (
		<Fragment>
			{entries.map((entry) =>
				entry.kind === "group" ? (
					<GroupBox
						key={entry.group.id}
						id={entry.group.id}
						name={entry.group.name}
						hue={entry.group.hue}
						isOpen={entry.group.isOpen}
						count={entry.group.items.length}
					>
						{entry.group.items.map((item) => itemOf(item, entry.group.id))}
					</GroupBox>
				) : (
					itemOf(entry, null)
				),
			)}
		</Fragment>
	);
}
