import { z } from "zod";

export const FramePictureSchema = z.object({ key: z.string(), url: z.string() });

export const FramePicturesSchema = z.object({
	shown: z.record(z.string(), z.record(z.string(), FramePictureSchema)),
	waiting: z.number(),
});

export const PictureAskSchema = z.object({
	widget: z.string(),
	state: z.string(),
	key: z.string(),
	node: z.custom<HTMLElement>((held) => held instanceof HTMLElement),
});

export const PictureAsksSchema = z.object({ asks: z.array(PictureAskSchema) });

export type FramePicture = z.output<typeof FramePictureSchema>;
export type FramePictures = z.output<typeof FramePicturesSchema>;
export type PictureAsk = z.output<typeof PictureAskSchema>;
