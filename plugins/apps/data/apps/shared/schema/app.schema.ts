import { z } from "zod";

export const AppFaceSchema = z.object({
	id: z.string(),
	title: z.string(),
	icon: z.string(),
});

export type AppFace = z.infer<typeof AppFaceSchema>;

export const AppsSchema = z.object({
	apps: z.array(AppFaceSchema).readonly(),
});
