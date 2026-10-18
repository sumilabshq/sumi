import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/core/requests";
import type { ColumnSide } from "../../../../shared/schema/tabs-column.schema.js";
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
	"cv:relative cv:flex cv:h-full cv:flex-none cv:flex-col cv:gap-1 cv:box-border cv:bg-transparent cv:font-[family-name:var(--font-sans)] cv:py-[var(--wg-kit-plate-pad,6px)]";
const PLATE_PAD_PX = 6;
const FULL_PAD: Readonly<Record<ColumnSide, string>> = {
	end: "cv:pe-[var(--wg-kit-plate-pad,6px)]",
	start: "cv:ps-[var(--wg-kit-plate-pad,6px)]",
};
const HEAD = "cv:flex cv:h-12 cv:flex-none cv:items-center cv:gap-1.5";
const HEAD_AT = {
	icons: `${HEAD} cv:justify-center`,
	full: `${HEAD} cv:mb-0.5`,
};
const TITLE = "cv:min-w-0 cv:flex-1 cv:ps-1";

export function TabsColumn({ title, icons, full }: TabsColumnProps): ReactElement | null {
	const { look, widthPx, side } = useQuery(TabsColumnQuery).data;

	if (look === "hidden") {
		return null;
	}

	return (
		<aside
			className={look === "full" ? `${COLUMN} ${FULL_PAD[side]}` : COLUMN}
			style={{ width: look === "full" ? widthPx + PLATE_PAD_PX : widthPx }}
			data-host-column={look}
			data-host-column-side={side}
		>
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
