import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { pinsChanged } from "../../gateways/pins/pins.events.js";
import type { PinsGateway } from "../../gateways/pins/pins.gateway.js";
import type { MovePins } from "../../gateways/pins/pins.gateway.js";
import { pinned, unpinned } from "../../shared/lib/pin-edits.js";
import { PinIdSchema, PinSchema, PinsSchema } from "../../shared/schema/pins.schema.js";

export const all = query()
	.public()
	.output(PinsSchema)
	.handle(async (_input, { pins }) => ({ pins: await pins.pins() }));

export const pin = command()
	.public()
	.input(PinSchema)
	.idempotencyKey(Repeatable)
	.handle(async (asked, { pins, invalidate }) => {
		invalidate(all);
		await movedAndSaid(pins, (now) => pinned(now, asked), `pin ${asked.id}`);
	});

export const unpin = command()
	.public()
	.input(PinIdSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { pins, invalidate }) => {
		invalidate(all);
		await movedAndSaid(pins, (now) => unpinned(now, id), `unpin ${id}`);
	});

export const reread = subscriber(pinsChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});

async function movedAndSaid(pins: PinsGateway, move: MovePins, asked: string): Promise<void> {
	const moved = await pins.movePins(move);
	console.info(`[widgetarium] ${moved === null ? `${asked} skipped: nothing changes` : moved.reason}`);
}
