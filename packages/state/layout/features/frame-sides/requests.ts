import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { frameSidesChanged } from "../../gateways/frame-sides/frame-sides.events.js";
import { FrameSideInputSchema, FrameSidesSchema } from "../../shared/schema/frame-sides.schema.js";
import { concealedLook, peekedLook, refuseTurn, toggledLook } from "./lib/side-looks.js";

export const frameSides = query()
	.public()
	.output(FrameSidesSchema)
	.settlesNow()
	.handle((_input, { frameSides }) => frameSides.sides());

export const toggleFrameSide = command()
	.public()
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.handle(({ side }, { frameSides: frameSidesGateway, invalidate }) => {
		invalidate(frameSides);
		const sides = frameSidesGateway.sides();
		const was = sides[side];
		const next = toggledLook(was);
		const refusal = refuseTurn(was, next);

		if (refusal !== null) {
			return refuse(`frame side ${side} ${refusal} (toggle)`);
		}

		const reason = `frame side ${side} ${was} → ${next} (toggle)`;
		frameSidesGateway.saveSides(
			{
				...sides,
				[side]: next,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const peekFrameSide = command()
	.public()
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.handle(({ side }, { frameSides: frameSidesGateway, invalidate }) => {
		invalidate(frameSides);
		const sides = frameSidesGateway.sides();
		const was = sides[side];
		const next = peekedLook(was);

		if (next === was) {
			console.info(`[widgetarium] frame side ${side} peek skipped: ${was}`);
			return;
		}

		const refusal = refuseTurn(was, next);

		if (refusal !== null) {
			return refuse(`frame side ${side} ${refusal} (peek)`);
		}

		const reason = `frame side ${side} ${was} → ${next} (peek)`;
		frameSidesGateway.saveSides(
			{
				...sides,
				[side]: next,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const concealFrameSide = command()
	.public()
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.handle(({ side }, { frameSides: frameSidesGateway, invalidate }) => {
		invalidate(frameSides);
		const sides = frameSidesGateway.sides();
		const was = sides[side];
		const next = concealedLook(was);

		if (next === was) {
			console.info(`[widgetarium] frame side ${side} conceal skipped: ${was}`);
			return;
		}

		const refusal = refuseTurn(was, next);

		if (refusal !== null) {
			return refuse(`frame side ${side} ${refusal} (conceal)`);
		}

		const reason = `frame side ${side} ${was} → ${next} (conceal)`;
		frameSidesGateway.saveSides(
			{
				...sides,
				[side]: next,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const rereadSides = subscriber(frameSidesChanged).handle((_input, { invalidate }) => {
	invalidate(frameSides);
});
