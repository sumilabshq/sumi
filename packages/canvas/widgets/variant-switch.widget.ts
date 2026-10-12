import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { CanvasPagesSchema } from "../schemas/canvas-page.schema.js";
import { VariantPickSchema } from "../schemas/canvas-view.schema.js";
import { VariantSwitch } from "../ui/variant-switch/variant-switch.js";

export const variantSwitchInject = inject({
	getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
	pickVariant: ICommand.input(VariantPickSchema),
});

export const VariantSwitchWidget = widget().inject(variantSwitchInject).render(VariantSwitch);
