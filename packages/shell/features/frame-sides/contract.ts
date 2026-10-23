import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { FrameSideSchema, FrameSidesSchema } from "../../shared/schema/frame-sides.schema.js";

const SideInputSchema = z.object({ side: FrameSideSchema });

export const FrameSidesQuery = query("shell/frame-sides").output(FrameSidesSchema).settlesNow();

export const ToggleFrameSideCommand = command("shell/toggle-frame-side")
	.input(SideInputSchema)
	.idempotencyKey(Repeatable)
	.invalidates([FrameSidesQuery]);

export const PeekFrameSideCommand = command("shell/peek-frame-side")
	.input(SideInputSchema)
	.idempotencyKey(Repeatable)
	.invalidates([FrameSidesQuery]);

export const ConcealFrameSideCommand = command("shell/conceal-frame-side")
	.input(SideInputSchema)
	.idempotencyKey(Repeatable)
	.invalidates([FrameSidesQuery]);
