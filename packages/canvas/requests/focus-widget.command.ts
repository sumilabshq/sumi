import { z } from "zod";
import { command } from "@widgetarium/core/mediator";

export const FocusWidgetCommand = command("canvas/focus-widget")
	.input(z.object({ widget: z.string() }))
	.idempotencyKey("none");
