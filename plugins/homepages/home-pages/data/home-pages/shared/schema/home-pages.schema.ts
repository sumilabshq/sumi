import { z } from "zod";

export const HomePageFaceSchema = z.object({
	id: z.string().min(1),
	title: z.string(),
});

export type HomePageFace = z.infer<typeof HomePageFaceSchema>;

export const HomePagesSchema = z.object({
	pages: z.array(HomePageFaceSchema).readonly(),
	chosen: z.string().nullable(),
});

export type HomePages = z.infer<typeof HomePagesSchema>;

export const HomePageChoiceSchema = z.object({
	id: z.string().min(1),
});
