import { z } from "zod";
import { TabAppSchema } from "./app-tab.schema.js";

export const EssentialSchema = z.object({
	id: z.string(),
	app: TabAppSchema,
	address: z.string().nullable(),
	title: z.string(),
	favicon: z.string().nullable(),
});

export type Essential = z.infer<typeof EssentialSchema>;

export const KeptEssentialsSchema = z.object({
	essentials: z.array(EssentialSchema),
	minted: z.number().int().nonnegative(),
});

export type KeptEssentials = z.infer<typeof KeptEssentialsSchema>;
