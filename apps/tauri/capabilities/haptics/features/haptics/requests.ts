import { PerCall } from "@widgetarium/data-framework";
import { command } from "#module";
import { HapticTapInputSchema } from "../../shared/schema/haptics.schema.js";

export const tap = command()
	.public()
	.input(HapticTapInputSchema)
	.idempotencyKey(PerCall)
	.handle(({ pattern }, { taps }) => taps.tap(pattern));
