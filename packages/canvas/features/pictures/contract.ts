import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { PictureAskSchema } from "../../schema/frame-picture.schema.js";

export const AskForPictureCommand = command("canvas/ask-for-picture")
	.input(PictureAskSchema)
	.idempotencyKey(Repeatable);

export const FramePictureQuery = query("canvas/frame-picture")
	.input(z.object({ frame: z.string(), key: z.string(), isAtOnce: z.boolean() }))
	.output(z.object({ url: z.string().nullable(), isLiveHidden: z.boolean(), isAsked: z.boolean() }));

export const PicturesProgressQuery = query("canvas/pictures-progress").output(
	z.object({ isShown: z.boolean(), said: z.string() }),
);
