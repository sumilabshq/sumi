import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { FrameEdgeSchema, FrameWidthsSchema } from "../../shared/schema/frame-widths.schema.js";

const WidthPxSchema = z.number().finite().positive();

export const FrameWidthsQuery = query("shell/frame-widths").output(FrameWidthsSchema).settlesNow();

export const ResizeFrameEdgeCommand = command("shell/resize-frame-edge")
	.input(
		z.object({
			edge: FrameEdgeSchema,
			px: WidthPxSchema,
			mostPx: WidthPxSchema,
		}),
	)
	.idempotencyKey(Repeatable)
	.invalidates([FrameWidthsQuery]);

export const ResetFrameEdgeCommand = command("shell/reset-frame-edge")
	.input(z.object({ edge: FrameEdgeSchema, mostPx: WidthPxSchema }))
	.idempotencyKey(Repeatable)
	.invalidates([FrameWidthsQuery]);
