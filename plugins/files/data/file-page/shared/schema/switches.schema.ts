import { z } from "zod";

export const FileSwitchSchema = z.enum(["wrap", "values", "source", "size"]);

export type FileSwitch = z.infer<typeof FileSwitchSchema>;

export const SwitchesSchema = z.object({
	on: z.array(FileSwitchSchema),
	loads: z.number().int().nonnegative(),
});

export type Switches = z.infer<typeof SwitchesSchema>;

export const FlipFileSwitchInputSchema = z.object({
	name: FileSwitchSchema,
});
