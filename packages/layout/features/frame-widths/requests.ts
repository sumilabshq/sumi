import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { FRAME_BOUNDS, edgePxWithin } from "../../shared/lib/frame-bounds.js";
import { FrameWidthsStore } from "../../shared/lib/frame-widths-store.js";
import { FrameEdgeSchema, FrameWidthsSchema, WidthPxSchema } from "../../shared/schema/frame-widths.schema.js";
import type { FrameEdge } from "../../shared/schema/frame-widths.schema.js";

interface KeptEdge {
	readonly edge: FrameEdge;
	readonly px: number;
	readonly reason: string;
}

export const FrameWidthsQuery = query("layout/frame-widths")
	.output(FrameWidthsSchema)
	.settlesNow()
	.inject({ frameWidthsStore: FrameWidthsStore })
	.watch((_input, { frameWidthsStore }, changed) => frameWidthsStore.watch(changed))
	.handle((_input, { frameWidthsStore }) => frameWidthsStore.now());

export const ResizeFrameEdgeCommand = command("layout/resize-frame-edge")
	.input(
		z.object({
			edge: FrameEdgeSchema,
			px: WidthPxSchema,
			mostPx: WidthPxSchema,
		}),
	)
	.idempotencyKey(Repeatable)
	.invalidates([FrameWidthsQuery])
	.inject({ frameWidthsStore: FrameWidthsStore })
	.handle(({ edge, px, mostPx }, { frameWidthsStore }) =>
		keepEdge(
			{
				edge,
				px: edgePxWithin(edge, px, mostPx),
				reason: "drag",
			},
			frameWidthsStore,
		),
	);

export const ResetFrameEdgeCommand = command("layout/reset-frame-edge")
	.input(
		z.object({
			edge: FrameEdgeSchema,
			mostPx: WidthPxSchema,
		}),
	)
	.idempotencyKey(Repeatable)
	.invalidates([FrameWidthsQuery])
	.inject({ frameWidthsStore: FrameWidthsStore })
	.handle(({ edge, mostPx }, { frameWidthsStore }) =>
		keepEdge(
			{
				edge,
				px: edgePxWithin(edge, FRAME_BOUNDS[edge].usualPx, mostPx),
				reason: "reset",
			},
			frameWidthsStore,
		),
	);

function keepEdge({ edge, px, reason }: KeptEdge, frameWidthsStore: FrameWidthsStore): void {
	frameWidthsStore.become(
		{
			...frameWidthsStore.now(),
			[edge]: px,
		},
		`${edge} ${reason}`,
	);
}
