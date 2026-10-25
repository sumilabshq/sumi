import { z } from "zod";
import { AnswerSchema } from "./answer";
import type { Answer } from "./answer";
import type { AnyRequest } from "./request";

export const WIRE_PREFIX = "/rpc";

export const WIRE_CHANGES_PATH = "/rpc-changes";

export const WireCallSchema = z.object({ input: z.unknown().optional(), idempotencyKey: z.string().nullable() });

export type WireCall = z.infer<typeof WireCallSchema>;

export function wirePathOf(request: AnyRequest): string[] {
	return request.name.split("/");
}

export function wireAnswerOf(answered: unknown): Answer<unknown> | null {
	const parsed = AnswerSchema.safeParse(answered);

	if (!parsed.success) {
		return null;
	}

	if (!parsed.data.ok) {
		return parsed.data;
	}

	return {
		...parsed.data,
		output: parsed.data.output,
	};
}
