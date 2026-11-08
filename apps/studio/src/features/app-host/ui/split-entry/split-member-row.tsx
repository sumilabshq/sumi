import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SplitMember } from "@widgetarium/app-host";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";
import { HolderEntry } from "../tabs-sidebar/holder-entry.js";
import { TabRow } from "../tab-row/tab-row.js";
import type { RowBadge } from "../tab-row/row-badge.js";

export interface SplitMemberRowProps {
	readonly member: SplitMember;
	readonly splitId: string;
	readonly renaming: RowRenaming;
}

const PINNED_BADGE: RowBadge = { kind: "pinned" };

export function SplitMemberRow({ member, splitId, renaming }: SplitMemberRowProps): ReactElement {
	const badge = member.isPinned ? PINNED_BADGE : null;
	const { item } = member;

	if (item.children !== undefined) {
		return (
			<HolderEntry
				holder={item}
				children={item.children}
				groupId={null}
				splitId={splitId}
				renaming={renaming}
				badge={badge}
			/>
		);
	}

	return (
		<TabRow
			item={item}
			groupId={null}
			splitId={splitId}
			place="top"
			isRenaming={renaming.id === item.tab.id}
			onRenamed={renaming.onRenamed}
			badge={badge}
		/>
	);
}
