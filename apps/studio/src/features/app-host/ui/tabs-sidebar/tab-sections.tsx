import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { TabSection } from "@widgetarium/app-host";
import { NewTabRow } from "./new-tab-row.js";
import { SectionHead } from "./section-head.js";
import { SidebarList } from "./sidebar-list.js";

export interface TabSectionsProps {
	readonly sections: readonly TabSection[];
	readonly newTabList: string;
	readonly renamingId: string | null;
	readonly onRenamed: () => void;
	readonly onGroupMade: (groupId: string) => void;
}

const SECTION = "cv:contents";

export function TabSections({
	sections,
	newTabList,
	renamingId,
	onRenamed,
	onGroupMade,
}: TabSectionsProps): ReactElement {
	return (
		<Fragment>
			{sections.map((section) => (
				<div key={section.list} className={SECTION} data-tabs-in={section.list}>
					<SectionHead section={section} onGroupMade={onGroupMade} />
					{section.isOpen ? (
						<NewTabRow list={section.list} title={section.title} isShortcutTarget={section.list === newTabList} />
					) : null}
					<SidebarList section={section} renamingId={renamingId} onRenamed={onRenamed} />
				</div>
			))}
		</Fragment>
	);
}
