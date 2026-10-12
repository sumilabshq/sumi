import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { CanvasModeSchema, ModeAskSchema } from "../schemas/canvas-view.schema.js";
import { ModeSwitch } from "../ui/mode-switch/mode-switch.js";

export const modeSwitchInject = inject({
	getMode: IQuery.output(CanvasModeSchema.default("hand")),
	setMode: ICommand.input(ModeAskSchema),
});

export const ModeSwitchWidget = widget().inject(modeSwitchInject).render(ModeSwitch);
