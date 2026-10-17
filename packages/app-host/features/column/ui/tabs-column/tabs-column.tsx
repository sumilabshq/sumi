import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { TabsColumnQuery } from "../../contract.js";
import { ColumnToggle } from "../column-toggle/column-toggle.js";
import { ColumnEdge } from "./column-edge.js";
import { ColumnMenu } from "./column-menu.js";

export interface TabsColumnProps {
	readonly title: ReactNode;
	readonly icons: ReactNode;
	readonly full: ReactNode;
}

const COLUMN =
	"cv:relative cv:flex cv:h-full cv:flex-none cv:flex-col cv:gap-1 cv:bg-group cv:py-[var(--wg-kit-plate-pad,6px)]";
const HEAD = "cv:flex cv:h-12 cv:flex-none cv:items-center cv:gap-1.5";
const HEAD_AT = {
	icons: `${HEAD} cv:justify-center`,
	full: `${HEAD} cv:px-1.5`,
};
const TITLE = "cv:min-w-0 cv:flex-1";

export function TabsColumn({ title, icons, full }: TabsColumnProps): ReactElement | null {
	const { look, widthPx, side } = useQuery(TabsColumnQuery).data;

	if (look === "hidden") {
		return null;
	}

	return (
		<aside className={COLUMN} style={{ width: widthPx }} data-host-column={look} data-host-column-side={side}>
			<ColumnEdge side={side} widthPx={widthPx} />
			<div className={HEAD_AT[look]}>
				<ColumnToggle />
				{look === "full" ? <span className={TITLE}>{title}</span> : null}
				{look === "full" ? <ColumnMenu side={side} /> : null}
			</div>
			{look === "icons" ? icons : full}
		</aside>
	);
}
