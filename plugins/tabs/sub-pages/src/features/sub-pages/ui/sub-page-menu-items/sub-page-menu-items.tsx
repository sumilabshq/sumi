import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Icon, PopoverItem } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import type { AppTabState } from "@widgetarium/app-host/contract";
import { mainPageOf } from "../../lib/page-entries.js";

export interface SubPageMenuItemsProps {
	readonly tab: AppTabState;
	readonly onDone: () => void;
}

const ITEM_ICON_PX = 16;
const TAKE_OUT = "Take out of {title}";

export function SubPageMenuItems({ tab, onDone }: SubPageMenuItemsProps): ReactElement | null {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const placeTab = useCommand(appHost.tabs.placeTab);
	const main = mainPageOf(sidebar, tab.id);

	if (main === null) {
		return null;
	}

	const takeOut = (): void => {
		onDone();
		void placeTab
			.run({ id: tab.id, to: { kind: "list", list: main.list, groupId: null, before: null } })
			.then((answer) => {
				if (!answer.ok) {
					console.warn(`[widgetarium] taking ${tab.id} out of ${main.page.tab.id} refused: ${answer.reason}`);
				}
			});
	};
	return (
		<PopoverItem role="menuitem" onClick={takeOut}>
			<Icon name="arrow-up-left" size={ITEM_ICON_PX} />
			{TAKE_OUT.replace("{title}", main.page.tab.title)}
		</PopoverItem>
	);
}
