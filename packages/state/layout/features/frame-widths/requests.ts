import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { FrameWidthsChangedEvent } from "../../gateways/frame-widths/frame-widths.events.js";
import { FRAME_BOUNDS, FRAME_LIMITS, edgePxWithin, widthsWithin } from "../../shared/lib/frame-bounds.js";
import { FrameEdgeSchema, FrameWidthsAnswerSchema, WidthPxSchema } from "../../shared/schema/frame-widths.schema.js";

export const FrameWidthsQuery = query("frame-widths")
	.public()
	.output(FrameWidthsAnswerSchema)
	.settlesNow()
	.handle((_input, { frameWidths }) => ({
		...widthsWithin(frameWidths.widths()),
		bounds: FRAME_LIMITS,
	}));

export const ResizeFrameEdgeCommand = command("resize-frame-edge")
	.public()
	.input(
		z.object({
			edge: FrameEdgeSchema,
			px: WidthPxSchema,
			mostPx: WidthPxSchema,
		}),
	)
	.idempotencyKey(Repeatable)
	.handle(({ edge, px, mostPx }, { frameWidths, invalidate }) => {
		invalidate(FrameWidthsQuery);
		const widths = widthsWithin(frameWidths.widths());
		const next = edgePxWithin(edge, px, mostPx);

		if (widths[edge] === next) {
			return;
		}

		const reason = `frame width ${edge} ${widths[edge]} → ${next} (drag)`;
		frameWidths.saveWidths(
			{
				...widths,
				[edge]: next,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const ResetFrameEdgeCommand = command("reset-frame-edge")
	.public()
	.input(
		z.object({
			edge: FrameEdgeSchema,
			mostPx: WidthPxSchema,
		}),
	)
	.idempotencyKey(Repeatable)
	.handle(({ edge, mostPx }, { frameWidths, invalidate }) => {
		invalidate(FrameWidthsQuery);
		const widths = widthsWithin(frameWidths.widths());
		const next = edgePxWithin(edge, FRAME_BOUNDS[edge].usualPx, mostPx);

		if (widths[edge] === next) {
			return;
		}

		const reason = `frame width ${edge} ${widths[edge]} → ${next} (reset)`;
		frameWidths.saveWidths(
			{
				...widths,
				[edge]: next,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const RereadFrameWidthsSubscriber = subscriber(FrameWidthsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(FrameWidthsQuery);
});
