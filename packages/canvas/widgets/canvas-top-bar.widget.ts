import { ISlot, inject, widget } from "@widgetarium/core";
import { CanvasTopBar } from "../ui/canvas-top-bar/canvas-top-bar.js";

export const canvasTopBarInject = inject({
	cornersStart: ISlot.array(),
	start: ISlot.array(),
	end: ISlot.array(),
	cornersEnd: ISlot.array(),
});

export const CanvasTopBarWidget = widget().inject(canvasTopBarInject).render(CanvasTopBar);
