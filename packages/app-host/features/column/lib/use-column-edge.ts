import { useEffect, useRef } from "react";
import { useEdgeResize } from "@widgetarium/behaviors";
import type { EdgeResizeHandlers } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/core/requests";
import type { ColumnSide } from "../../../shared/schema/tabs-column.schema.js";
import { ResizeColumnCommand, ShowColumnIconsCommand } from "../contract.js";

export function useColumnEdge(side: ColumnSide, widthPx: number): EdgeResizeHandlers {
	const resizeColumn = useCommand(ResizeColumnCommand);
	const showColumnIcons = useCommand(ShowColumnIconsCommand);
	const askedPx = useRef<number | null>(null);
	useEffect(() => {
		askedPx.current = null;
	}, [widthPx]);
	const handlers = useEdgeResize({
		widthOf: () => askedPx.current ?? widthPx,
		edge: side === "end" ? "start" : "end",
		onResize: (px) => {
			askedPx.current = px;
			void resizeColumn.run({ px });
		},
		onReset: () => void showColumnIcons.run(),
	});
	return {
		...handlers,
		onPointerDown: (event) => {
			askedPx.current = null;
			handlers.onPointerDown(event);
		},
	};
}
