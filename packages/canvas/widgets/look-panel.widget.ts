import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { LookPickSchema, LookReadSchema } from "../schemas/look.schema.js";
import { LookPanel } from "../ui/look-panel/look-panel.js";

export const lookPanelInject = inject({
	getLook: IQuery.output(LookReadSchema.nullable().default(null)),
	pickLook: ICommand.input(LookPickSchema),
});

export const LookPanelWidget = widget().inject(lookPanelInject).render(LookPanel);
