import { z } from "zod";
import { query } from "@widgetarium/core/mediator";

export const FramePictureQuery = query("canvas/frame-picture")
	.input(z.object({ frame: z.string(), key: z.string(), isAtOnce: z.boolean() }))
	.output(z.object({ url: z.string().nullable(), isLiveHidden: z.boolean(), isAsked: z.boolean() }));
