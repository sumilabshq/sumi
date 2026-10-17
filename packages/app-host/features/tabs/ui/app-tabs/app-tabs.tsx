import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RAISED_PILL } from "@widgetarium/canvas";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { AppTabsQuery, ShowAppCommand } from "../../contract.js";
import { AppTabButton } from "./app-tab-button.js";

const APPS = "Apps";
const TABS_PILL = `${RAISED_PILL} cv:flex cv:flex-none cv:items-center cv:gap-0.5 cv:p-1`;

// TODO: resting tabs into an overflow menu once a second app exists
export function AppTabs(): ReactElement {
	const { tabs, preview } = useQuery(AppTabsQuery).data;
	const showApp = useCommand(ShowAppCommand);
	return (
		<div role="tablist" aria-label={APPS} className={TABS_PILL} data-host-tabs="">
			{tabs.map((tab) => (
				<AppTabButton
					key={tab.id}
					tab={tab}
					look={tab.isShown ? "shown" : "resting"}
					onPick={() => void showApp.run({ id: tab.id })}
				/>
			))}
			{preview ? (
				<AppTabButton tab={preview} look="preview" onPick={() => void showApp.run({ id: preview.id })} />
			) : null}
		</div>
	);
}
