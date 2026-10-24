import { z } from "zod";
import { AnswerSchema } from "./answer";
import type { Answer } from "./answer";
import type { AnyRequest } from "./request";

export const WIRE_PREFIX = "/rpc";

export const WireCallSchema = z.object({ input: z.unknown().optional(), idempotencyKey: z.string().nullable() });

export type WireCall = z.infer<typeof WireCallSchema>;

export function wirePathOf(request: AnyRequest): string[] {
	return request.name.split("/");
}

export function wireAnswerOf(answered: unknown): Answer<unknown> | null {
	const parsed = AnswerSchema.safeParse(answered);
	return parsed.success ? parsed.data : null;
}
