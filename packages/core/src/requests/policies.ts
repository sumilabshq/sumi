import { refusalOf } from "./answer";
import type { Refusal } from "./answer";
import type { GuardCall, User } from "./guard";
import type { Route } from "./mediator";
import type { RateLimits } from "./rate-limits";
import { SERVER_RATE_LIMIT } from "./rate-limits";
import type { AnyRequest } from "./request";

type KeyRead = { readonly key: string | null } | { readonly refusal: Refusal };

const NO_CALL_KEY = "{name} is PerCall: send it with an idempotency key";
const RATE_LIMITED = "{name} was called too often; try again shortly";
const ANONYMOUS = "anonymous";
const WHOLE_CALL = "";

export async function guardRefusal({ guards, provided }: Route, call: GuardCall): Promise<Refusal | null> {
	for (const guard of guards) {
		const verdict = await guard.check(call, provided);
		if (verdict !== null) return refusalOf(verdict.code, verdict.reason);
	}
	return null;
}

export async function rateLimitRefusal(
	rateLimits: RateLimits,
	request: AnyRequest,
	user: User | null,
): Promise<Refusal | null> {
	const isAllowed = await rateLimits.take(
		callerKeyOf(request.name, user, WHOLE_CALL),
		request.limit ?? SERVER_RATE_LIMIT,
	);
	return isAllowed ? null : refusalOf("rate-limited", RATE_LIMITED.replace("{name}", request.name));
}

export function callerKeyOf(name: string, user: User | null, tail: string): string {
	return JSON.stringify([name, user?.id ?? ANONYMOUS, tail]);
}

export function keyRead(request: AnyRequest, input: unknown, given: string | undefined): KeyRead {
	const policy = request.keyPolicy;
	if (request.kind === "query" || policy === null) return { key: null };
	if (typeof policy === "function") return { key: policy(input) };
	if (policy.policy === "repeatable") return { key: null };
	if (given !== undefined) return { key: given };
	return { refusal: refusalOf("missing-key", NO_CALL_KEY.replace("{name}", request.name)) };
}
