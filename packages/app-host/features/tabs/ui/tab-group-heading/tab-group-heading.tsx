import { createElement as h } from "react";
import type { ReactElement } from "react";
import { groupRowProps } from "../../../../shared/lib/tab-drag/tab-groups.js";
import type { TabGroup } from "../../../../shared/lib/tab-drag/tab-groups.js";

const GROUP = "cv:m-0 cv:px-3.5 cv:pt-2.5 cv:pb-1 cv:text-sm cv:leading-[17px] cv:font-medium cv:text-muted-foreground";
const GROUP_SAID: Readonly<Record<TabGroup, string>> = {
	pinned: "Pinned apps",
	open: "Open tabs",
};

export function TabGroupHeading({ group }: { readonly group: TabGroup }): ReactElement {
	return (
		<p className={GROUP} {...groupRowProps(group)} data-host-tab-group={group}>
			{GROUP_SAID[group]}
		</p>
	);
}
