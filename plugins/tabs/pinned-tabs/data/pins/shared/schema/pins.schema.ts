import { z } from "zod";

export const PinSchema = z.object({
	id: z.string().min(1).describe("the id of the tab the pin opens; one open tab at most carries it"),
	app: z.string().regex(/^[a-z][a-z0-9-]*$/, "an app id is lowercase letters, digits and dashes"),
	address: z.string(),
	title: z.string(),
	icon: z.string(),
	favicon: z.string().nullable(),
});

export type Pin = z.infer<typeof PinSchema>;

export const PinsSchema = z.object({
	pins: z.array(PinSchema).readonly(),
});

export const PinIdSchema = z.object({
	id: z.string().min(1),
});
