import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SidebarTab, SplitMark } from "@widgetarium/app-host";
import { TabRow } from "../tab-row/tab-row.js";
import type { RowBadge } from "../tab-row/row-badge.js";
import { HolderEntry } from "./holder-entry.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";

export interface ListedItemProps {
	readonly item: SidebarTab;
	readonly groupId: string | null;
	readonly renaming: RowRenaming;
}

export function ListedItem({ item, groupId, renaming }: ListedItemProps): ReactElement {
	const badge = badgeOf(item.splitMark ?? null);

	if (item.children !== undefined) {
		return <HolderEntry holder={item} children={item.children} groupId={groupId} renaming={renaming} badge={badge} />;
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
