import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GroupBox } from "../../../features/groups/ui/group-box/group-box.js";
import { TabRow } from "../../../features/tabs/ui/tab-row/tab-row.js";
import type { AppTabState, SidebarEntry } from "../../schema/app-tab.schema.js";

export interface SidebarListProps {
	readonly entries: readonly SidebarEntry[];
	readonly renamingId: string | null;
	readonly onRenamed: () => void;
}

const LIST = "cv:flex cv:flex-col cv:gap-px";

export function SidebarList({ entries, renamingId, onRenamed }: SidebarListProps): ReactElement {
	const rowOf = (tab: AppTabState, groupId: string | null): ReactElement => (
		<TabRow key={tab.id} tab={tab} groupId={groupId} isRenaming={renamingId === tab.id} onRenamed={onRenamed} />
	);
	return (
		<div className={LIST} data-tabs-list="">
			{entries.map((entry) =>
				entry.kind === "tab" ? (
					rowOf(entry.tab, null)
				) : (
					<GroupBox
						key={entry.group.id}
						id={entry.group.id}
						name={entry.group.name}
						hue={entry.group.hue}
						isOpen={entry.group.isOpen}
						count={entry.group.tabs.length}
					>
						{entry.group.tabs.map((tab) => rowOf(tab, entry.group.id))}
					</GroupBox>
				),
			)}
		</div>
	);
}
