import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { PageRendererSchema, RendererAskSchema } from "../schemas/canvas-view.schema.js";
import { DrawingKitSchema } from "../schemas/drawing.schema.js";
import { RendererSwitch } from "../ui/renderer-switch/renderer-switch.js";

export const rendererSwitchInject = inject({
	getDrawing: IQuery.output(DrawingKitSchema.nullable().default(null)),
	getRenderer: IQuery.output(PageRendererSchema.default("html")),
	chooseRenderer: ICommand.input(RendererAskSchema),
});

export const RendererSwitchWidget = widget().inject(rendererSwitchInject).render(RendererSwitch);
