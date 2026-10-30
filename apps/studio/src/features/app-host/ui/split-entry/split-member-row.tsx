import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SidebarTab, SplitMember } from "@widgetarium/app-host";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";
import { HolderEntry } from "../tabs-sidebar/holder-entry.js";
import { TabRow } from "../tab-row/tab-row.js";
import type { RowBadge } from "../tab-row/row-badge.js";

export interface SplitMemberRowProps {
	readonly member: SplitMember;
	readonly renaming: RowRenaming;
}

const PINNED_BADGE: RowBadge = { kind: "pinned" };

export function SplitMemberRow({ member, renaming }: SplitMemberRowProps): ReactElement {
	const badge = member.isPinned ? PINNED_BADGE : null;
	const item = withShownByFocus(member);

	if (item.children !== undefined) {
		return <HolderEntry holder={item} children={item.children} groupId={null} renaming={renaming} badge={badge} />;
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

function withShownByFocus({ item, isFocused }: SplitMember): SidebarTab {
	return { ...item, tab: { ...item.tab, isShown: isFocused } };
}
