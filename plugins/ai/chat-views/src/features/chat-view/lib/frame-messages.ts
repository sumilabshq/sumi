import { z } from "zod";

export const FrameMessageSchema = z.discriminatedUnion("sumiView", [
	z.object({
		sumiView: z.literal("height"),
		height: z.number().nonnegative().max(20_000),
	}),
	z.object({
		sumiView: z.literal("open"),
		href: z.string().min(1).max(8192),
		inNewTab: z.boolean(),
	}),
]);

export type FrameMessage = z.output<typeof FrameMessageSchema>;
