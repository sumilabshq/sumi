import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { TabsColumnQuery } from "../../contract.js";
import { ColumnEdge } from "./column-edge.js";

const COLUMN = "wg-root cv:relative cv:pt-0 cv:flex cv:h-full cv:flex-none cv:flex-col cv:box-border cv:bg-transparent";

export function TabsColumn({ children }: { readonly children: ReactNode }): ReactElement {
	const { widthPx, side } = useQuery(TabsColumnQuery).data;
	return (
		<aside className={COLUMN} style={{ width: widthPx }} data-host-column="" data-host-column-side={side}>
			<ColumnEdge side={side} widthPx={widthPx} />
			{children}
		</aside>
	);
}
