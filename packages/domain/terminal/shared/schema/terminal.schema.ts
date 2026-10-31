import { z } from "zod";

export const SendTerminalInputSchema = z.object({
	line: z.string().max(65536),
});

export const TerminalOutputSchema = z.object({
	output: z.string(),
	isRunning: z.boolean(),
	exitCode: z.number().nullable(),
});

export type TerminalOutput = z.infer<typeof TerminalOutputSchema>;
