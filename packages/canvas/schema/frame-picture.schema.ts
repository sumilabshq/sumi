import { z } from "zod";

const FramePictureSchema = z.object({ key: z.string(), url: z.string() });

const FramePicturesSchema = z.object({
	shown: z.record(z.string(), FramePictureSchema),
	waiting: z.number(),
});

export const PictureAskSchema = z.object({
	frame: z.string(),
	key: z.string(),
	node: z.custom<HTMLElement>((held) => held instanceof HTMLElement),
});

export type FramePicture = z.output<typeof FramePictureSchema>;
export type FramePictures = z.output<typeof FramePicturesSchema>;
export type PictureAsk = z.output<typeof PictureAskSchema>;
