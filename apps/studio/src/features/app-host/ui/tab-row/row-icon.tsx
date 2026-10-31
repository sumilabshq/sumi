import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SidebarTab } from "@widgetarium/app-host";
import { TabFaceIcon } from "../tab-face/tab-face-icon.js";

export function RowIcon({ item }: { readonly item: SidebarTab }): ReactElement {
	const { tab } = item;
	return (
		<TabFaceIcon
			icon={tab.icon}
			favicon={tab.favicon}
			title={tab.title}
			address={tab.address}
			mark={tab.mark}
			size="row"
		/>
	);
}
