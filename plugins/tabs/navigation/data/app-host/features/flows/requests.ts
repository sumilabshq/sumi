import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { navigation } from "@widgetarium/navigation/contract";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { FlowIdAskSchema } from "../../shared/schema/flow-ask.schema.js";

export const open = command()
	.public()
	.input(FlowIdAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ flowId }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.flows.open, { at, window: at.window, flowId }),
		);
	});

export const remove = command()
	.public()
	.input(FlowIdAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ flowId }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.flows.remove, { at, flowId }),
		);
	});
