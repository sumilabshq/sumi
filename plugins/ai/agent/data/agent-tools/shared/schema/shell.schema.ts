import { z } from "zod";

export const ShellFolderSchema = z
	.string()
	.min(1)
	.max(4096)
	.startsWith("/")
	.describe("Absolute path of the folder the command runs in");

export const RunNameSchema = z.string().min(1).max(60).describe("A short name you pick for this process");

export const RunAskedSchema = z.object({
	command: z.string().min(1).max(65536).describe("A shell command line, run by sh -c"),
	folder: ShellFolderSchema,
	timeoutSeconds: z
		.number()
		.int()
		.min(1)
		.max(600)
		.optional()
		.describe("How long to wait, 120 when omitted; past it the command keeps running in the background"),
});

export const StartAskedSchema = z.object({
	name: RunNameSchema,
	command: z.string().min(1).max(65536).describe("A shell command line, run by sh -c"),
	folder: ShellFolderSchema,
});

export const OutputAskedSchema = z.object({
	name: RunNameSchema,
	from: z.number().int().min(0).optional().describe("Line to read from: the next of the last answer, 0 when omitted"),
});

export const StopAskedSchema = z.object({
	name: RunNameSchema,
});

export const ShellRunSchema = z.object({
	name: z.string(),
	status: z.enum(["not-started", "running", "exited"]),
	exitCode: z.number().nullable(),
	lines: z.array(z.string()),
	isCut: z.boolean(),
	next: z.number().int(),
});

export type ShellRun = z.infer<typeof ShellRunSchema>;
