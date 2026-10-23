import { z } from "zod";

export const FrameSideSchema = z.enum(["left", "right"]);

export type FrameSide = z.infer<typeof FrameSideSchema>;

export const SideLookSchema = z.enum(["docked", "hidden", "peeking"]);

export type SideLook = z.infer<typeof SideLookSchema>;

export const FrameSidesSchema = z.object({
	left: SideLookSchema,
	right: SideLookSchema,
});

export type FrameSides = z.infer<typeof FrameSidesSchema>;
