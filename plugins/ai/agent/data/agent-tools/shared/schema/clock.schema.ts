import { z } from "zod";

export const NowSchema = z.object({
	utc: z.string(),
	local: z.string(),
	timeZone: z.string(),
});

export const WaitAskedSchema = z.object({
	seconds: z.number().int().min(1).max(600),
});

export const WaitedSchema = z.object({
	waitedSeconds: z.number().int(),
});
