import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { SidebarEntry } from "@widgetarium/app-host";
import { GroupBox } from "../group-box/group-box.js";
import { SplitEntry } from "../split-entry/split-entry.js";
import { ListedItem } from "./listed-item.js";
import type { RowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";

export interface SidebarEntriesProps {
	readonly entries: readonly SidebarEntry[];
	readonly renaming: RowRenaming;
}

export function SidebarEntries({ entries, renaming }: SidebarEntriesProps): ReactElement {
	return (
		<Fragment>
			{entries.map((entry) => {
				if (entry.kind === "split") {
					return <SplitEntry key={entry.split.id} split={entry.split} renaming={renaming} />;
				}

				if (entry.kind !== "group") {
					return <ListedItem key={entry.tab.id} item={entry} groupId={null} renaming={renaming} />;
				}

				return (
					<GroupBox
						key={entry.group.id}
						id={entry.group.id}
						name={entry.group.name}
						hue={entry.group.hue}
						isOpen={entry.group.isOpen}
						count={entry.group.items.length}
					>
						{entry.group.items.map((item) => (
							<ListedItem key={item.tab.id} item={item} groupId={entry.group.id} renaming={renaming} />
						))}
					</GroupBox>
				);
			})}
		</Fragment>
	);
}
