import { z } from "zod";

export const TerminalSessionIdSchema = z.string().min(1).max(200);

export const TerminalSessionSchema = z.object({
	session: TerminalSessionIdSchema,
});

export const SendTerminalInputSchema = z.object({
	session: TerminalSessionIdSchema,
	line: z.string().max(65536),
});

export const TypeTerminalInputSchema = z.object({
	session: TerminalSessionIdSchema,
	keys: z.string().min(1).max(65536),
});

export const TerminalSizeSchema = z.object({
	cols: z.number().int().min(1).max(1000),
	rows: z.number().int().min(1).max(1000),
});

export const ResizeTerminalInputSchema = z.object({
	session: TerminalSessionIdSchema,
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

export const RunProgramInputSchema = z.object({
	folder: z.string().min(1).max(4096).startsWith("/"),
	program: z.string().min(1).max(256),
	args: z.array(z.string().max(65536)).max(128),
});

export type RunProgramInput = z.infer<typeof RunProgramInputSchema>;

export const ProgramOutputSchema = z.object({
	code: z.number().int(),
	out: z.string(),
	err: z.string(),
});

export type ProgramOutput = z.infer<typeof ProgramOutputSchema>;

export const ProcessRunIdSchema = z.string().min(1).max(200);

export const StartProcessInputSchema = z.object({
	run: ProcessRunIdSchema,
	folder: z.string().min(1).max(4096).startsWith("/"),
	program: z.string().min(1).max(4096),
	args: z.array(z.string().max(1048576)).max(256),
	env: z.record(z.string(), z.string().max(65536)).optional(),
});

export type StartProcessInput = z.infer<typeof StartProcessInputSchema>;

export const ProcessRunSchema = z.object({
	run: ProcessRunIdSchema,
});

export const ProcessOutputAskedSchema = z.object({
	run: ProcessRunIdSchema,
	from: z.number().int().nonnegative(),
});

export const ProcessStreamSchema = z.enum(["out", "err"]);

export type ProcessStream = z.infer<typeof ProcessStreamSchema>;

export const ProcessLineSchema = z.object({
	stream: ProcessStreamSchema,
	text: z.string(),
});

export type ProcessLine = z.infer<typeof ProcessLineSchema>;

export const ProcessOutputSchema = z.object({
	lines: z.array(ProcessLineSchema),
	next: z.number().int().nonnegative(),
	status: TerminalStatusSchema,
	exitCode: z.number().nullable(),
});

export type ProcessOutput = z.infer<typeof ProcessOutputSchema>;
