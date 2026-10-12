import { z } from "zod";
import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { CanvasPagesSchema } from "../schemas/canvas-page.schema.js";
import { LayersToggle } from "../ui/layers-toggle/layers-toggle.js";

export const layersToggleInject = inject({
	getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
	getIsLayersOpen: IQuery.output(z.boolean().default(false)),
	toggleLayers: ICommand,
});

export const LayersToggleWidget = widget().inject(layersToggleInject).render(LayersToggle);
