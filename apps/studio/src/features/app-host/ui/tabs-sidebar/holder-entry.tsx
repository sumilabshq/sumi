import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { FoldTabCommand } from "@widgetarium/app-host";
import type { SidebarTab, TabChild } from "@widgetarium/app-host";
import { FoldBox } from "../fold-box/fold-box.js";
import { GroupBox } from "../group-box/group-box.js";
import type { RowFold } from "../tab-row/fold-chevron.js";
import { TabRow } from "../tab-row/tab-row.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";
import type { RowBadge } from "../tab-row/row-badge.js";

export interface HolderEntryProps {
	readonly holder: SidebarTab;
	readonly children: readonly TabChild[];
	readonly groupId: string | null;
	readonly renaming: RowRenaming;
	readonly badge?: RowBadge | null;
}

const CHILDREN = "cv:flex cv:flex-col cv:gap-px cv:empty:hidden";

export function HolderEntry({ holder, children, groupId, renaming, badge = null }: HolderEntryProps): ReactElement {
	const foldTab = useCommand(FoldTabCommand);
	const isFolded = holder.isFolded ?? false;
	const fold: RowFold | null =
		children.length === 0 ? null : { isFolded, onToggle: () => void foldTab.run({ id: holder.tab.id }) };
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
				item={holder}
				groupId={groupId}
				place="top"
				isRenaming={renaming.id === holder.tab.id}
				onRenamed={renaming.onRenamed}
				badge={badge}
				fold={fold}
			/>
			<FoldBox isOpen={!isFolded}>
				<div className={CHILDREN} data-tabs-list={holder.tab.id} data-tabs-in={holder.tab.id} data-tabs-nested="">
					{children.map((child) =>
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
			</FoldBox>
		</Fragment>
	);
}
