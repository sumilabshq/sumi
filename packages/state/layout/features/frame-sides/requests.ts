import { Repeatable, command, query, refuse } from "@widgetarium/core/requests";
import { FrameSidesGateway } from "../../gateways/frame-sides/frame-sides.gateway.js";
import { FrameSideInputSchema, FrameSidesSchema } from "../../shared/schema/frame-sides.schema.js";
import { concealedLook, peekedLook, refuseTurn, toggledLook } from "./lib/side-looks.js";

export const FrameSidesQuery = query("frame-sides")
	.output(FrameSidesSchema)
	.settlesNow()
	.inject({ frameSides: FrameSidesGateway })
	.watch((_input, { frameSides }, changed) => frameSides.sidesChanged(changed))
	.handle((_input, { frameSides }) => frameSides.sides());

export const ToggleFrameSideCommand = command("toggle-frame-side")
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.invalidates([FrameSidesQuery])
	.inject({ frameSides: FrameSidesGateway })
	.handle(({ side }, { frameSides }) => {
		const sides = frameSides.sides();
		const was = sides[side];
		const next = toggledLook(was);
		const refusal = refuseTurn(was, next);

		if (refusal !== null) {
			return refuse(`frame side ${side} ${refusal} (toggle)`);
		}

		const reason = `frame side ${side} ${was} → ${next} (toggle)`;
		frameSides.saveSides(
			{
				...sides,
				[side]: next,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const PeekFrameSideCommand = command("peek-frame-side")
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.invalidates([FrameSidesQuery])
	.inject({ frameSides: FrameSidesGateway })
	.handle(({ side }, { frameSides }) => {
		const sides = frameSides.sides();
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
		frameSides.saveSides(
			{
				...sides,
				[side]: next,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const ConcealFrameSideCommand = command("conceal-frame-side")
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.invalidates([FrameSidesQuery])
	.inject({ frameSides: FrameSidesGateway })
	.handle(({ side }, { frameSides }) => {
		const sides = frameSides.sides();
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
		frameSides.saveSides(
			{
				...sides,
				[side]: next,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});
