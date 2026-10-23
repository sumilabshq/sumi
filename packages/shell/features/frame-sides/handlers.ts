import { handler } from "@widgetarium/core/requests";
import { FrameSidesGateway } from "../../gateways/frame-sides/frame-sides.gateway.js";
import { FrameSidesStore } from "../../shared/lib/frame-sides-store.js";
import { ShellClientModule } from "../../module.js";
import { ConcealFrameSideCommand, FrameSidesQuery, PeekFrameSideCommand, ToggleFrameSideCommand } from "./contract.js";

export const FrameSidesQueryHandler = handler(FrameSidesQuery, ShellClientModule)
	.inject({ frameSidesStore: FrameSidesStore })
	.watch((_input, { frameSidesStore }, changed) => frameSidesStore.watch(changed))
	.handle((_input, { frameSidesStore }) => frameSidesStore.now());

export const ToggleFrameSideCommandHandler = handler(ToggleFrameSideCommand, ShellClientModule)
	.inject({
		frameSidesStore: FrameSidesStore,
		frameSidesGateway: FrameSidesGateway,
	})
	.handle(({ side }, { frameSidesStore, frameSidesGateway }) => {
		frameSidesStore.toggle(side);
		frameSidesGateway.rememberHidden(side, frameSidesStore.now()[side] === "hidden");
	});

export const PeekFrameSideCommandHandler = handler(PeekFrameSideCommand, ShellClientModule)
	.inject({ frameSidesStore: FrameSidesStore })
	.handle(({ side }, { frameSidesStore }) => frameSidesStore.peek(side));

export const ConcealFrameSideCommandHandler = handler(ConcealFrameSideCommand, ShellClientModule)
	.inject({ frameSidesStore: FrameSidesStore })
	.handle(({ side }, { frameSidesStore }) => frameSidesStore.conceal(side));
