import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { GroupItem, SplitMark } from "@widgetarium/app-host";
import { TabRow } from "../tab-row/tab-row.js";
import type { RowBadge } from "../tab-row/row-badge.js";
import { ChatEntry } from "./chat-entry.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";

export interface ListedItemProps {
	readonly item: GroupItem;
	readonly groupId: string | null;
	readonly renaming: RowRenaming;
}

export function ListedItem({ item, groupId, renaming }: ListedItemProps): ReactElement {
	const badge = badgeOf(item.splitMark ?? null);

	if (item.kind === "chat") {
		return <ChatEntry chat={item.chat} groupId={groupId} renaming={renaming} badge={badge} />;
	}

	return (
		<TabRow
			item={item}
			groupId={groupId}
			place="top"
			isRenaming={renaming.id === item.tab.id}
			onRenamed={renaming.onRenamed}
			badge={badge}
		/>
	);
}

function badgeOf(mark: SplitMark | null): RowBadge | null {
	return mark === null ? null : { kind: "split-map", map: mark.map };
}
