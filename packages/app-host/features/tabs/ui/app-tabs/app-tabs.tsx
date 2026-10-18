import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { RAISED_PILL } from "@widgetarium/canvas";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { AppTabsQuery, CloseTabCommand, ShowTabCommand } from "../../contract.js";
import { AppTabButton } from "./app-tab-button.js";
import { useKeepsShownInView } from "../../lib/use-keeps-shown-in-view.js";

const TABS = "Tabs";
const TABS_PILL = `${RAISED_PILL} cv:flex cv:min-w-0 cv:shrink cv:items-center cv:gap-0.5 cv:p-1`;
const TAB_ROW =
	"cv:flex cv:min-w-10 cv:max-w-[34cqw] cv:shrink cv:items-center cv:gap-0.5 cv:overflow-x-auto cv:rounded-full cv:[scrollbar-width:none]";

export function AppTabs({ end }: { readonly end: ReactNode }): ReactElement {
	const { tabs, preview } = useQuery(AppTabsQuery).data;
	const showTab = useCommand(ShowTabCommand);
	const closeTab = useCommand(CloseTabCommand);
	const row = useKeepsShownInView(tabs.find((tab) => tab.isShown)?.id ?? null);
	return (
		<div className={TABS_PILL} data-host-tabs="">
			<div ref={row} role="tablist" aria-label={TABS} className={TAB_ROW}>
				{tabs.map((tab) => (
					<AppTabButton
						key={tab.id}
						tab={tab}
						look={tab.isShown ? "shown" : "resting"}
						onPick={() => void showTab.run({ id: tab.id })}
						onClose={() => void closeTab.run({ id: tab.id })}
					/>
				))}
				{preview ? (
					<AppTabButton
						tab={preview}
						look="preview"
						onPick={() => void showTab.run({ id: preview.id })}
						onClose={() => void closeTab.run({ id: preview.id })}
					/>
				) : null}
			</div>
			{end}
		</div>
	);
}
