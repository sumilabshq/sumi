import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { widthsChanged } from "../../gateways/frame-widths/frame-widths.events.js";
import { FRAME_BOUNDS, FRAME_LIMITS, edgePxWithin, widthsWithin } from "../../shared/lib/frame-bounds.js";
import { FrameEdgeSchema, FrameWidthsAnswerSchema, WidthPxSchema } from "../../shared/schema/frame-widths.schema.js";

export const current = query()
	.public()
	.output(FrameWidthsAnswerSchema)
	.settlesNow()
	.handle((_input, { frameWidths }) => ({
		...widthsWithin(frameWidths.widths()),
		bounds: FRAME_LIMITS,
	}));

export const resizeEdge = command()
	.public()
	.input(
		z.object({
			edge: FrameEdgeSchema,
			px: WidthPxSchema,
			mostPx: WidthPxSchema,
		}),
	)
	.idempotencyKey(Repeatable)
	.handle(({ edge, px, mostPx }, { frameWidths: frameWidthsGateway, invalidate }) => {
		invalidate(current);
		const widths = widthsWithin(frameWidthsGateway.widths());
		const next = edgePxWithin(edge, px, mostPx);

		if (widths[edge] === next) {
			return;
		}

		const reason = `frame width ${edge} ${widths[edge]} → ${next} (drag)`;
		frameWidthsGateway.saveWidths(
			{
				...widths,
				[edge]: next,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const resetEdge = command()
	.public()
	.input(
		z.object({
			edge: FrameEdgeSchema,
			mostPx: WidthPxSchema,
		}),
	)
	.idempotencyKey(Repeatable)
	.handle(({ edge, mostPx }, { frameWidths: frameWidthsGateway, invalidate }) => {
		invalidate(current);
		const widths = widthsWithin(frameWidthsGateway.widths());
		const next = edgePxWithin(edge, FRAME_BOUNDS[edge].usualPx, mostPx);

		if (widths[edge] === next) {
			return;
		}

		const reason = `frame width ${edge} ${widths[edge]} → ${next} (reset)`;
		frameWidthsGateway.saveWidths(
			{
				...widths,
				[edge]: next,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const reread = subscriber(widthsChanged).handle((_input, { invalidate }) => {
	invalidate(current);
});
