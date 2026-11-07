import { z } from "zod";

export const AppFaceSchema = z.object({
	id: z.string(),
	title: z.string(),
	iconUrl: z.string().nullable(),
	art: z.string().nullable(),
	isListed: z.boolean(),
});

export type AppFace = z.infer<typeof AppFaceSchema>;

export const AppsSchema = z.object({
	apps: z.array(AppFaceSchema).readonly(),
});
