import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SidebarTab, TabChild } from "@widgetarium/app-host";
import { GroupBox } from "../group-box/group-box.js";
import { TabRow } from "../tab-row/tab-row.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";
import { NESTED_ROWS } from "../../lib/tabs-look/tabs-look.js";

interface HolderChildrenProps {
	readonly holderId: string;
	readonly children: readonly TabChild[];
	readonly renaming: RowRenaming;
}

export function HolderChildren({ holderId, children, renaming }: HolderChildrenProps): ReactElement {
	const childOf = (child: SidebarTab, childGroupId: string | null): ReactElement => (
		<TabRow
			key={child.tab.id}
			item={child}
			groupId={childGroupId}
			place={childGroupId === null ? "child" : "top"}
			isRenaming={renaming.id === child.tab.id}
			onRenamed={renaming.onRenamed}
		/>
	);
	return (
		<div className={NESTED_ROWS} data-tabs-list={holderId} data-tabs-in={holderId} data-tabs-nested="">
			{children.map((child) =>
				child.kind === "tab" ? (
					childOf(child, null)
				) : (
					<GroupBox key={child.group.id} group={child.group} count={child.group.tabs.length}>
						{child.group.tabs.map((tab) => childOf({ kind: "tab", tab }, child.group.id))}
					</GroupBox>
				),
			)}
		</div>
	);
}
