import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppTab } from "@widgetarium/app-host";
import { STATUS_MARK } from "../../lib/tab-status/tab-status.js";
import { TabGlyph } from "./tab-glyph.js";

export type TabIconLook = "row" | "rail" | "rail-shown";

export interface TabIconProps {
	readonly tab: AppTab;
	readonly look: TabIconLook;
}

const ICON =
	"cv:relative cv:grid cv:flex-none cv:place-items-center cv:rounded-full cv:transition-[background-color,color] cv:duration-150 cv:ease-standard";
const BOX: Readonly<Record<TabIconLook, string>> = {
	row: `${ICON} cv:size-7 cv:text-ink`,
	rail: `${ICON} cv:size-10 cv:text-ink`,
	"rail-shown": `${ICON} cv:size-10 cv:bg-primary cv:text-primary-foreground`,
};
const MARK_AT: Readonly<Record<TabIconLook, string>> = {
	row: "cv:-top-px cv:-right-px",
	rail: "cv:top-0.5 cv:right-0.5",
	"rail-shown": "cv:top-0.5 cv:right-0.5",
};

export function TabIcon({ tab, look }: TabIconProps): ReactElement {
	return (
		<span className={BOX[look]} data-host-tab-icon="">
			<TabGlyph tab={tab} />
			{tab.status === null ? null : (
				<span
					aria-hidden="true"
					className={tab.status === "reading" ? STATUS_MARK.reading : `${STATUS_MARK[tab.status]} ${MARK_AT[look]}`}
					data-host-tab-status={tab.status}
				/>
			)}
		</span>
	);
}
