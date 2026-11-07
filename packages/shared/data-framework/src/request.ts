import { z } from "zod";
import type { Duration } from "./duration";
import type { AnyEvent, Emitter } from "./event";
import type { Guard } from "./guard";
import type { Handle, Inject } from "./handler";
import { handlingOf } from "./handled-request";
import type { HandledRequest, InvalidatorOf, RequestHandlerBuilder } from "./handled-request";
import { requireStep } from "./middleware";
import type { Added, Middleware, NothingAdded, Step, StepNeedingOptions, TakesOptionsFirst } from "./middleware";
import type { NothingProvided } from "./module";

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

export type Visibility =
	| { readonly reach: "process" }
	| { readonly reach: "public" }
	| { readonly reach: "modules"; readonly modules: readonly string[] };

export type NamedModule = { readonly definition: { readonly name: string } } | { readonly name: string };

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
	readonly visibility: Visibility;
}

const REQUEST_NAME = /^(?:([a-z][a-z0-9-]*)\/)?[a-z][a-z0-9-]*$/;
const BAD_NAME =
	'a request is named in kebab case, "<name>" in a module(...) or "<module>/<name>" in a contract, got "{name}"';
const VISIBLE_TWICE =
	"{request} already says who may call it: a request is .public() or .callableBy(...) once, never both";
const NO_MODULES = "{request}.callableBy() names no module: name the modules that may call it";
const IN_PROCESS: Visibility = Object.freeze({ reach: "process" });
const PUBLIC: Visibility = Object.freeze({ reach: "public" });

type ProvidedOfRequest<R> = R extends Contract<RequestKind, z.ZodType, z.ZodType, KeyStage, infer P> ? P : never;

export class Contract<
	K extends RequestKind,
	I extends z.ZodType,
	O extends z.ZodType,
	Key extends KeyStage,
	P extends object = NothingProvided,
> {
	readonly kind: K;
	readonly name: string;
	readonly module: string | null;
	readonly inputSchema: I;
	readonly outputSchema: O;
	readonly keyPolicy: IdempotencyKey<unknown> | null;
	readonly freshFor: Duration | null;
	readonly isSettledNow: boolean;
	readonly invalidated: readonly AnyQuery[] | null;
	readonly visibility: Visibility;

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
		this.visibility = definition.visibility;
	}

	input<S extends z.ZodType>(schema: S): Contract<K, S, O, Key, P> {
		return new Contract({ ...this.definition, input: schema }, this.keyStage);
	}

	output<S extends z.ZodType>(schema: S): Contract<K, I, S, Key, P> {
		return new Contract({ ...this.definition, output: schema }, this.keyStage);
	}

	idempotencyKey(
		this: Contract<"command", I, O, "unkeyed", P>,
		key: IdempotencyKey<z.output<I>>,
	): Contract<"command", I, O, "keyed", P> {
		return new Contract({ ...this.definition, idempotencyKey: key }, "keyed");
	}

	cache(this: Contract<"query", I, O, Key, P>, policy: CachePolicy): Contract<"query", I, O, Key, P> {
		return new Contract({ ...this.definition, freshFor: policy.freshFor }, this.keyStage);
	}

	settlesNow(this: Contract<"query", I, O, Key, P>): Contract<"query", I, O, Key, P> {
		return new Contract({ ...this.definition, settlesNow: true }, this.keyStage);
	}

	invalidates(
		this: Contract<"command", I, O, Key, P>,
		queries: readonly ListedQuery[],
	): Contract<"command", I, O, Key, P> {
		const invalidates = queries.map((listed) => (listed instanceof Contract ? listed : listed.request));
		return new Contract({ ...this.definition, invalidates }, this.keyStage);
	}

	public(): Contract<K, I, O, Key, P> {
		this.refuseSecondVisibility();
		return new Contract({ ...this.definition, visibility: PUBLIC }, this.keyStage);
	}

	callableBy(...modules: readonly NamedModule[]): Contract<K, I, O, Key, P> {
		if (modules.length === 0) {
			throw new Error(NO_MODULES.replace("{request}", this.name));
		}

		this.refuseSecondVisibility();
		const visibility: Visibility = { reach: "modules", modules: modules.map(nameOfModule) };
		return new Contract({ ...this.definition, visibility }, this.keyStage);
	}

	inModule(module: string): Contract<K, I, O, Key, P> {
		if (this.module !== null) {
			return this;
		}

		const invalidates = this.invalidated?.map((listed) => listed.inModule(module)) ?? null;
		return new Contract({ ...this.definition, name: `${module}/${this.name}`, module, invalidates }, this.keyStage);
	}

	emits<R extends AnyRequest, const E extends readonly AnyEvent[]>(
		this: R,
		...events: E
	): RequestHandlerBuilder<R, ProvidedOfRequest<R>, Emitter<E[number]>> {
		return handlingOf<R, ProvidedOfRequest<R>>(this).emits(...events);
	}

	guard<R extends AnyRequest, A extends Added>(
		this: R,
		step: Guard<InputOf<R>, A, Inject>,
	): RequestHandlerBuilder<R, ProvidedOfRequest<R>, A>;
	guard(this: AnyRequest, step: StepNeedingOptions): TakesOptionsFirst;
	guard(this: AnyRequest, step: Step | StepNeedingOptions): unknown {
		return handlingOf(this, requireStep(step));
	}

	use<R extends AnyRequest, A extends Added>(
		this: R,
		step: Middleware<InputOf<R>, A, Inject>,
	): RequestHandlerBuilder<R, ProvidedOfRequest<R>, A>;
	use(this: AnyRequest, step: StepNeedingOptions): TakesOptionsFirst;
	use(this: AnyRequest, step: Step | StepNeedingOptions): unknown {
		return handlingOf(this, requireStep(step));
	}

	handle<R extends AnyRequest>(
		this: R,
		handle: Handle<R, ProvidedOfRequest<R>, InvalidatorOf<R>>,
	): HandledRequest<R, ProvidedOfRequest<R>, NothingAdded> {
		return handlingOf<R, ProvidedOfRequest<R>>(this).handle(handle);
	}

	private refuseSecondVisibility(): void {
		if (this.visibility.reach !== "process") {
			throw new Error(VISIBLE_TWICE.replace("{request}", this.name));
		}
	}
}

type ListedQuery = AnyQuery | HandledRequest<AnyQuery, object, Added>;

export interface CommandNeedsIdempotencyKey<I extends z.ZodType, O extends z.ZodType, P extends object = NothingProvided> {
	readonly name: string;
	input<S extends z.ZodType>(schema: S): CommandNeedsIdempotencyKey<S, O, P>;
	output<S extends z.ZodType>(schema: S): CommandNeedsIdempotencyKey<I, S, P>;
	invalidates(queries: readonly ListedQuery[]): CommandNeedsIdempotencyKey<I, O, P>;
	public(): CommandNeedsIdempotencyKey<I, O, P>;
	callableBy(...modules: readonly NamedModule[]): CommandNeedsIdempotencyKey<I, O, P>;
	idempotencyKey(key: IdempotencyKey<z.output<I>>): Contract<"command", I, O, "keyed", P>;
}

export type Query<I extends z.ZodType, O extends z.ZodType> = Contract<"query", I, O, KeyStage, object>;
export type Command<I extends z.ZodType, O extends z.ZodType> = Contract<"command", I, O, "keyed", object>;

export type AnyQuery = Query<z.ZodType, z.ZodType>;
export type AnyCommand = Command<z.ZodType, z.ZodType>;
export type AnyRequest = AnyQuery | AnyCommand;

export type SentOf<R extends AnyRequest> = z.input<R["inputSchema"]>;
export type InputOf<R extends AnyRequest> = z.output<R["inputSchema"]>;
export type ReturnedOf<R extends AnyRequest> = z.input<R["outputSchema"]>;
export type OutputOf<R extends AnyRequest> = z.output<R["outputSchema"]>;
export type InputArgs<R extends AnyRequest> = [SentOf<R>] extends [void] ? [input?: SentOf<R>] : [input: SentOf<R>];

export function query<P extends object = NothingProvided>(
	name: string,
): Contract<"query", z.ZodVoid, z.ZodVoid, "keyed", P> {
	return new Contract(definitionOf("query", name), "keyed");
}

export function command<P extends object = NothingProvided>(
	name: string,
): CommandNeedsIdempotencyKey<z.ZodVoid, z.ZodVoid, P> {
	return new Contract<"command", z.ZodVoid, z.ZodVoid, "unkeyed", P>(definitionOf("command", name), "unkeyed");
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

export function nameOfModule(named: NamedModule): string {
	return "definition" in named ? named.definition.name : named.name;
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
		visibility: IN_PROCESS,
	};
}
