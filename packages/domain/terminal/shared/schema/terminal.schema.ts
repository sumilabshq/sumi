import { z } from "zod";

export const SendTerminalInputSchema = z.object({
	line: z.string().max(65536),
});

export const TypeTerminalInputSchema = z.object({
	keys: z.string().min(1).max(65536),
});

export const TerminalSizeSchema = z.object({
	cols: z.number().int().min(1).max(1000),
	rows: z.number().int().min(1).max(1000),
});

export type TerminalSize = z.infer<typeof TerminalSizeSchema>;

export const TerminalStatusSchema = z.enum(["not-started", "running", "exited"]);

export const TerminalOutputSchema = z.object({
	output: z.string(),
	status: TerminalStatusSchema,
	exitCode: z.number().nullable(),
});

export type TerminalOutput = z.infer<typeof TerminalOutputSchema>;
