import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { TabSection } from "../../schema/app-tab.schema.js";
import { SectionHead } from "./section-head.js";
import { SidebarList } from "./sidebar-list.js";

export interface TabSectionsProps {
	readonly sections: readonly TabSection[];
	readonly renamingId: string | null;
	readonly onRenamed: () => void;
	readonly onGroupMade: (groupId: string) => void;
}

const SECTION = "cv:contents";

export function TabSections({ sections, renamingId, onRenamed, onGroupMade }: TabSectionsProps): ReactElement {
	return (
		<Fragment>
			{sections.map((section) => (
				<div key={section.list} className={SECTION} data-tabs-in={section.list}>
					<SectionHead section={section} onGroupMade={onGroupMade} />
					<SidebarList section={section} renamingId={renamingId} onRenamed={onRenamed} />
				</div>
			))}
		</Fragment>
	);
}
