import { refusalOf } from "./answer";
import type { Refusal } from "./answer";
import type { User } from "./guard";
import type { AnyRequest } from "./request";

type KeyRead = { readonly key: string | null } | { readonly refusal: Refusal };

export type Callers = "one" | "many";

const NO_CALL_KEY = "{name} is PerCall: send it with an idempotency key";
const ANONYMOUS = "anonymous";

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

export function isKeyReplayed(request: AnyRequest, user: User | null, callers: Callers): boolean {
	return user !== null || callers === "one" || typeof request.keyPolicy !== "function";
}
