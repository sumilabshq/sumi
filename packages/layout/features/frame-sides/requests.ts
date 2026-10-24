import { Repeatable, command, query } from "@widgetarium/core/requests";
import { FrameSidesStore } from "../../shared/lib/frame-sides-store.js";
import { FrameSideInputSchema, FrameSidesSchema } from "../../shared/schema/frame-sides.schema.js";

export const FrameSidesQuery = query("layout/frame-sides")
	.output(FrameSidesSchema)
	.settlesNow()
	.inject({ frameSidesStore: FrameSidesStore })
	.watch((_input, { frameSidesStore }, changed) => frameSidesStore.watch(changed))
	.handle((_input, { frameSidesStore }) => frameSidesStore.now());

export const ToggleFrameSideCommand = command("layout/toggle-frame-side")
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.invalidates([FrameSidesQuery])
	.inject({ frameSidesStore: FrameSidesStore })
	.handle(({ side }, { frameSidesStore }) => frameSidesStore.toggle(side));

export const PeekFrameSideCommand = command("layout/peek-frame-side")
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.invalidates([FrameSidesQuery])
	.inject({ frameSidesStore: FrameSidesStore })
	.handle(({ side }, { frameSidesStore }) => frameSidesStore.peek(side));

export const ConcealFrameSideCommand = command("layout/conceal-frame-side")
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.invalidates([FrameSidesQuery])
	.inject({ frameSidesStore: FrameSidesStore })
	.handle(({ side }, { frameSidesStore }) => frameSidesStore.conceal(side));
