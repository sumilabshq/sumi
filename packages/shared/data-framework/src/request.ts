import { z } from "zod";
import type { Duration } from "./duration";
import type { AnyEvent, Emitter } from "./event";
import type { Guard } from "./guard";
import type { Handle, Inject, Unreserved } from "./handler";
import { handlingOf } from "./handled-request";
import type { HandledRequest, InvalidatorOf, RequestHandlerBuilder } from "./handled-request";
import type { Added, Middleware, NothingAdded } from "./middleware";

type RequestKind = "query" | "command";
type KeyStage = "unkeyed" | "keyed";

type KeyMaker<In> = { bivariant(input: In): string }["bivariant"];

export interface KeyPolicy {
	readonly policy: "per-call" | "repeatable";
}

export type IdempotencyKey<In> = KeyPolicy | KeyMaker<In>;

export const PerCall: KeyPolicy = Object.freeze({ policy: "per-call" });
export const Repeatable: KeyPolicy = Object.freeze({ policy: "repeatable" });

export interface CachePolicy {
	readonly freshFor: Duration;
}

interface Definition<K extends RequestKind, I extends z.ZodType, O extends z.ZodType> {
	readonly kind: K;
	readonly name: string;
	readonly module: string | null;
	readonly input: I;
	readonly output: O;
	readonly idempotencyKey: IdempotencyKey<unknown> | null;
	readonly freshFor: Duration | null;
	readonly settlesNow: boolean;
	readonly invalidates: readonly AnyQuery[] | null;
}

const REQUEST_NAME = /^(?:([a-z][a-z0-9-]*)\/)?[a-z][a-z0-9-]*$/;
const BAD_NAME =
	'a request is named in kebab case, "<name>" in a module(...) or "<module>/<name>" in a contract, got "{name}"';

export class Contract<K extends RequestKind, I extends z.ZodType, O extends z.ZodType, Key extends KeyStage> {
	readonly kind: K;
	readonly name: string;
	readonly module: string | null;
	readonly inputSchema: I;
	readonly outputSchema: O;
	readonly keyPolicy: IdempotencyKey<unknown> | null;
	readonly freshFor: Duration | null;
	readonly isSettledNow: boolean;
	readonly invalidated: readonly AnyQuery[] | null;

	constructor(
		private readonly definition: Definition<K, I, O>,
		readonly keyStage: Key,
	) {
		this.kind = definition.kind;
		this.name = definition.name;
		this.module = definition.module;
		this.inputSchema = definition.input;
		this.outputSchema = definition.output;
		this.keyPolicy = definition.idempotencyKey;
		this.freshFor = definition.freshFor;
		this.isSettledNow = definition.settlesNow;
		this.invalidated = definition.invalidates;
	}

	input<S extends z.ZodType>(schema: S): Contract<K, S, O, Key> {
		return new Contract({ ...this.definition, input: schema }, this.keyStage);
	}

	output<S extends z.ZodType>(schema: S): Contract<K, I, S, Key> {
		return new Contract({ ...this.definition, output: schema }, this.keyStage);
	}

	idempotencyKey(
		this: Contract<"command", I, O, "unkeyed">,
		key: IdempotencyKey<z.output<I>>,
	): Contract<"command", I, O, "keyed"> {
		return new Contract({ ...this.definition, idempotencyKey: key }, "keyed");
	}

	cache(this: Contract<"query", I, O, Key>, policy: CachePolicy): Contract<"query", I, O, Key> {
		return new Contract({ ...this.definition, freshFor: policy.freshFor }, this.keyStage);
	}

	settlesNow(this: Contract<"query", I, O, Key>): Contract<"query", I, O, Key> {
		return new Contract({ ...this.definition, settlesNow: true }, this.keyStage);
	}

	invalidates(this: Contract<"command", I, O, Key>, queries: readonly ListedQuery[]): Contract<"command", I, O, Key> {
		const invalidates = queries.map((listed) => (listed instanceof Contract ? listed : listed.request));
		return new Contract({ ...this.definition, invalidates }, this.keyStage);
	}

	inModule(module: string): Contract<K, I, O, Key> {
		if (this.module !== null) {
			return this;
		}

		const invalidates = this.invalidated?.map((listed) => listed.inModule(module)) ?? null;
		return new Contract({ ...this.definition, name: `${module}/${this.name}`, module, invalidates }, this.keyStage);
	}

	emits<R extends AnyRequest, const E extends readonly AnyEvent[]>(
		this: R,
		...events: E
	): RequestHandlerBuilder<R, NothingAdded, Emitter<E[number]>> {
		return handlingOf(this).emits(...events);
	}

	guard<R extends AnyRequest, A extends Added>(
		this: R,
		step: Guard<InputOf<R>, A, Inject>,
	): RequestHandlerBuilder<R, NothingAdded, A> {
		return handlingOf(this).guard(step);
	}

	use<R extends AnyRequest, A extends Added>(
		this: R,
		step: Middleware<InputOf<R>, A, Inject>,
	): RequestHandlerBuilder<R, NothingAdded, A> {
		return handlingOf(this).use(step);
	}

	inject<R extends AnyRequest, const N extends Inject>(
		this: R,
		inject: N & Unreserved<N>,
	): RequestHandlerBuilder<R, N, NothingAdded> {
		return handlingOf(this).inject<N>(inject);
	}

	handle<R extends AnyRequest>(
		this: R,
		handle: Handle<R, NothingAdded, InvalidatorOf<R>>,
	): HandledRequest<R, NothingAdded, NothingAdded> {
		return handlingOf(this).handle(handle);
	}
}

type ListedQuery = AnyQuery | HandledRequest<AnyQuery, Inject, Added>;

export type Query<I extends z.ZodType, O extends z.ZodType> = Contract<"query", I, O, KeyStage>;
export type Command<I extends z.ZodType, O extends z.ZodType> = Contract<"command", I, O, "keyed">;

export type AnyQuery = Query<z.ZodType, z.ZodType>;
export type AnyCommand = Command<z.ZodType, z.ZodType>;
export type AnyRequest = AnyQuery | AnyCommand;

export type SentOf<R extends AnyRequest> = z.input<R["inputSchema"]>;
export type InputOf<R extends AnyRequest> = z.output<R["inputSchema"]>;
export type ReturnedOf<R extends AnyRequest> = z.input<R["outputSchema"]>;
export type OutputOf<R extends AnyRequest> = z.output<R["outputSchema"]>;
export type InputArgs<R extends AnyRequest> = [SentOf<R>] extends [void] ? [input?: SentOf<R>] : [input: SentOf<R>];

export function query(name: string): Contract<"query", z.ZodVoid, z.ZodVoid, "keyed"> {
	return new Contract(definitionOf("query", name), "keyed");
}

export function command(name: string): Contract<"command", z.ZodVoid, z.ZodVoid, "unkeyed"> {
	return new Contract(definitionOf("command", name), "unkeyed");
}

export function isQuery(request: AnyRequest): request is AnyQuery {
	return request.kind === "query";
}

export function moduleOfName(name: string): string | null {
	const matched = REQUEST_NAME.exec(name);

	if (matched === null) {
		throw new Error(BAD_NAME.replace("{name}", name));
	}

	return matched[1] ?? null;
}

function definitionOf<K extends RequestKind>(kind: K, name: string): Definition<K, z.ZodVoid, z.ZodVoid> {
	return {
		kind,
		name,
		module: moduleOfName(name),
		input: z.void(),
		output: z.void(),
		idempotencyKey: null,
		freshFor: null,
		settlesNow: false,
		invalidates: null,
	};
}
