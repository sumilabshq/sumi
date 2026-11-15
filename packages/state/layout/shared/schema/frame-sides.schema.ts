import { z } from "zod";

export const FrameSideSchema = z.enum(["left"]);

export type FrameSide = z.infer<typeof FrameSideSchema>;

export const SideLookSchema = z.enum(["docked", "hidden", "peeking"]);

export type SideLook = z.infer<typeof SideLookSchema>;

export const TabsPlaceSchema = z.enum(["header", "sidebar"]);

export type TabsPlace = z.infer<typeof TabsPlaceSchema>;

export const FrameSidesSchema = z.object({
	left: SideLookSchema,
	tabs: TabsPlaceSchema,
});

export type FrameSides = z.infer<typeof FrameSidesSchema>;

export const FrameSideInputSchema = z.object({ side: FrameSideSchema });

export const TabsPlaceInputSchema = z.object({ tabs: TabsPlaceSchema });
