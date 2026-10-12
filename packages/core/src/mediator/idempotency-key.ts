import type { AnyRequest } from "./request";

const NO_CALL_KEY = '{name} is "per-call": send it with options.idempotencyKey';

export function idempotencyKeyOf(request: AnyRequest, input: unknown, given: string | undefined): string | null {
	if (request.kind === "query" || request.idempotencyKey === "none") return null;
	if (request.idempotencyKey !== "per-call") return request.idempotencyKey(input);
	if (given === undefined) throw new Error(NO_CALL_KEY.replace("{name}", request.name));
	return given;
}
