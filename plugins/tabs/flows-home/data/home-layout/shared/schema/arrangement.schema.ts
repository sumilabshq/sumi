import { z } from "zod";

export const MAX_APP_SPAN = 3;

export const AppTileSchema = z.object({
	app: z.string().min(1),
	span: z.number().int().min(1).max(MAX_APP_SPAN),
});

export type AppTile = z.infer<typeof AppTileSchema>;

export const ArrangementSchema = z.object({
	setupIds: z.array(z.string().min(1)),
	apps: z.array(AppTileSchema),
	hiddenApps: z.array(z.string().min(1)),
});

export type Arrangement = z.infer<typeof ArrangementSchema>;

export const ArrangeSetupsAskSchema = ArrangementSchema.pick({ setupIds: true });

export const ArrangeAppsAskSchema = ArrangementSchema.pick({ apps: true, hiddenApps: true });
