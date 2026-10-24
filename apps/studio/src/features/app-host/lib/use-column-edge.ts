import { useEffect, useRef } from "react";
import { useEdgeResize } from "@widgetarium/behaviors";
import type { EdgeResizeHandlers } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/core/requests";
import { ResetColumnCommand, ResizeColumnCommand } from "@widgetarium/app-host";
import type { ColumnSide } from "@widgetarium/app-host";

export function useColumnEdge(side: ColumnSide, widthPx: number): EdgeResizeHandlers {
	const resizeColumn = useCommand(ResizeColumnCommand);
	const resetColumn = useCommand(ResetColumnCommand);
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
		onReset: () => void resetColumn.run(),
	});
	return {
		...handlers,
		onPointerDown: (event) => {
			askedPx.current = null;
			handlers.onPointerDown(event);
		},
	};
}
