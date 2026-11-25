import { z } from "zod";

export const HapticPatternSchema = z.enum(["alignment", "levelChange", "generic"]);

export const HapticTapInputSchema = z.object({
	pattern: HapticPatternSchema,
});

export type HapticPattern = z.infer<typeof HapticPatternSchema>;
