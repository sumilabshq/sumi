import { ICommand, IQuery, widget } from "@widgetarium/core";
import { LookPickSchema, LookReadSchema } from "../schemas/look.schema.js";
import { LookPanel } from "../ui/look-panel/look-panel.js";

export const LookPanelWidget = widget()
	.inject({
		getLook: IQuery.output(LookReadSchema.nullable().default(null)),
		pickLook: ICommand.input(LookPickSchema),
	})
	.render(LookPanel);
