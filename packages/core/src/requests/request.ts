import { z } from "zod";
import type { Duration } from "./duration";
import { isPublicGuard } from "./guard";
import type { AnyGuard, Guard, OpenGuard } from "./guard";

type RequestKind = "query" | "command";
type GuardStage = "unguarded" | "guarded" | "public";
type KeyStage = "unkeyed" | "keyed";
type GuardedStage = "guarded" | "public";

type KeyMaker<In> = { bivariant(input: In): string }["bivariant"];

export interface KeyPolicy {
	readonly policy: "per-call" | "repeatable";
}

export type IdempotencyKey<In> = KeyPolicy | KeyMaker<In>;

export const PerCall: KeyPolicy = Object.freeze({ policy: "per-call" });
export const Repeatable: KeyPolicy = Object.freeze({ policy: "repeatable" });

export interface RateLimit {
	readonly calls: number;
	readonly per: Duration;
}

export interface CachePolicy {
	readonly freshFor: Duration;
}

interface Definition<K extends RequestKind, I extends z.ZodType, O extends z.ZodType> {
	readonly kind: K;
	readonly name: string;
	readonly module: string;
	readonly input: I;
	readonly output: O;
	readonly guards: readonly AnyGuard[];
	readonly rateLimit: RateLimit | null;
	readonly idempotencyKey: IdempotencyKey<unknown> | null;
	readonly freshFor: Duration | null;
	readonly settlesNow: boolean;
	readonly invalidates: readonly AnyQuery[] | null;
}

const REQUEST_NAME = /^([a-z][a-z0-9-]*)\/[a-z][a-z0-9-]*$/;
const BAD_NAME = 'a request is named "<module>/<name>" in kebab case, got "{name}"';

export class Contract<
	K extends RequestKind,
	I extends z.ZodType,
	O extends z.ZodType,
	G extends GuardStage,
	Key extends KeyStage,
> {
	readonly kind: K;
	readonly name: string;
	readonly module: string;
	readonly inputSchema: I;
	readonly outputSchema: O;
	readonly guards: readonly AnyGuard[];
	readonly limit: RateLimit | null;
	readonly keyPolicy: IdempotencyKey<unknown> | null;
	readonly freshFor: Duration | null;
	readonly isSettledNow: boolean;
	readonly invalidated: readonly AnyQuery[] | null;

	constructor(
		private readonly definition: Definition<K, I, O>,
		readonly guardStage: G,
		readonly keyStage: Key,
	) {
		this.kind = definition.kind;
		this.name = definition.name;
		this.module = definition.module;
		this.inputSchema = definition.input;
		this.outputSchema = definition.output;
		this.guards = definition.guards;
		this.limit = definition.rateLimit;
		this.keyPolicy = definition.idempotencyKey;
		this.freshFor = definition.freshFor;
		this.isSettledNow = definition.settlesNow;
		this.invalidated = definition.invalidates;
	}

	input<S extends z.ZodType>(schema: S): Contract<K, S, O, G, Key> {
		return new Contract({ ...this.definition, input: schema }, this.guardStage, this.keyStage);
	}

	output<S extends z.ZodType>(schema: S): Contract<K, I, S, G, Key> {
		return new Contract({ ...this.definition, output: schema }, this.guardStage, this.keyStage);
	}

	guard(this: Contract<K, I, O, "unguarded", Key>, wanted: OpenGuard): Contract<K, I, O, "public", Key>;
	guard(this: Contract<K, I, O, "unguarded" | "guarded", Key>, wanted: Guard): Contract<K, I, O, "guarded", Key>;
	guard(wanted: AnyGuard): Contract<K, I, O, GuardStage, Key> {
		const stage: GuardStage = isPublicGuard(wanted) ? "public" : "guarded";
		return new Contract({ ...this.definition, guards: [...this.definition.guards, wanted] }, stage, this.keyStage);
	}

	rateLimit(limit: RateLimit): Contract<K, I, O, G, Key> {
		return new Contract({ ...this.definition, rateLimit: limit }, this.guardStage, this.keyStage);
	}

	idempotencyKey(
		this: Contract<"command", I, O, G, "unkeyed">,
		key: IdempotencyKey<z.output<I>>,
	): Contract<"command", I, O, G, "keyed"> {
		return new Contract({ ...this.definition, idempotencyKey: key }, this.guardStage, "keyed");
	}

	cache(this: Contract<"query", I, O, G, Key>, policy: CachePolicy): Contract<"query", I, O, G, Key> {
		return new Contract({ ...this.definition, freshFor: policy.freshFor }, this.guardStage, this.keyStage);
	}

	settlesNow(this: Contract<"query", I, O, G, Key>): Contract<"query", I, O, G, Key> {
		return new Contract({ ...this.definition, settlesNow: true }, this.guardStage, this.keyStage);
	}

	invalidates(
		this: Contract<"command", I, O, G, Key>,
		queries: readonly AnyQuery[],
	): Contract<"command", I, O, G, Key> {
		return new Contract({ ...this.definition, invalidates: queries }, this.guardStage, this.keyStage);
	}
}

export type Query<I extends z.ZodType, O extends z.ZodType> = Contract<"query", I, O, GuardStage, KeyStage>;
export type Command<I extends z.ZodType, O extends z.ZodType> = Contract<"command", I, O, GuardStage, "keyed">;

export type AnyQuery = Query<z.ZodType, z.ZodType>;
export type AnyCommand = Command<z.ZodType, z.ZodType>;
export type AnyRequest = AnyQuery | AnyCommand;
export type GuardedRequest =
	| Contract<"query", z.ZodType, z.ZodType, GuardedStage, KeyStage>
	| Contract<"command", z.ZodType, z.ZodType, GuardedStage, "keyed">;

export type SentOf<R extends AnyRequest> = z.input<R["inputSchema"]>;
export type InputOf<R extends AnyRequest> = z.output<R["inputSchema"]>;
export type ReturnedOf<R extends AnyRequest> = z.input<R["outputSchema"]>;
export type OutputOf<R extends AnyRequest> = z.output<R["outputSchema"]>;
export type InputArgs<R extends AnyRequest> = [SentOf<R>] extends [void] ? [input?: SentOf<R>] : [input: SentOf<R>];

export function query(name: string): Contract<"query", z.ZodVoid, z.ZodVoid, "unguarded", "keyed"> {
	return new Contract(definitionOf("query", name), "unguarded", "keyed");
}

export function command(name: string): Contract<"command", z.ZodVoid, z.ZodVoid, "unguarded", "unkeyed"> {
	return new Contract(definitionOf("command", name), "unguarded", "unkeyed");
}

export function isQuery(request: AnyRequest): request is AnyQuery {
	return request.kind === "query";
}

function definitionOf<K extends RequestKind>(kind: K, name: string): Definition<K, z.ZodVoid, z.ZodVoid> {
	return {
		kind,
		name,
		module: moduleOf(name),
		input: z.void(),
		output: z.void(),
		guards: [],
		rateLimit: null,
		idempotencyKey: null,
		freshFor: null,
		settlesNow: false,
		invalidates: null,
	};
}

function moduleOf(name: string): string {
	const module = REQUEST_NAME.exec(name)?.[1];
	if (module === undefined) throw new Error(BAD_NAME.replace("{name}", name));
	return module;
}
