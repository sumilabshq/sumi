import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { PageRendererSchema, RendererAskSchema } from "../schemas/canvas-view.schema.js";
import { DrawingKitSchema } from "../schemas/drawing.schema.js";
import { RendererSwitch } from "../ui/renderer-switch/renderer-switch.js";

export const rendererSwitchInject = inject({
	drawingQuery: IQuery.output(DrawingKitSchema.nullable().default(null)),
	rendererQuery: IQuery.output(PageRendererSchema.default("html")),
	chooseRendererCommand: ICommand.input(RendererAskSchema),
});

export const RendererSwitchWidget = widget().inject(rendererSwitchInject).render(RendererSwitch);
