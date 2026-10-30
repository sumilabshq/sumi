import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { GroupItem, SplitMember } from "@widgetarium/app-host";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";
import { ChatEntry } from "../tabs-sidebar/chat-entry.js";
import { TabRow } from "../tab-row/tab-row.js";
import type { RowBadge } from "../tab-row/row-badge.js";

export interface SplitMemberRowProps {
	readonly member: SplitMember;
	readonly renaming: RowRenaming;
}

const PINNED_BADGE: RowBadge = { kind: "pinned" };

export function SplitMemberRow({ member, renaming }: SplitMemberRowProps): ReactElement {
	const badge = member.isPinned ? PINNED_BADGE : null;
	const item = focusShownOf(member);

	if (item.kind === "chat") {
		return <ChatEntry chat={item.chat} groupId={null} renaming={renaming} badge={badge} />;
	}

	return (
		<TabRow
			item={item}
			groupId={null}
			place="top"
			isRenaming={renaming.id === item.tab.id}
			onRenamed={renaming.onRenamed}
			badge={badge}
		/>
	);
}

function focusShownOf({ item, isFocused }: SplitMember): GroupItem {
	return item.kind === "chat"
		? { ...item, chat: { ...item.chat, isShown: isFocused } }
		: { ...item, tab: { ...item.tab, isShown: isFocused } };
}
