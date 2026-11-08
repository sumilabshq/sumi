import { z } from "zod";
import type { Duration } from "./duration";
import type { AnyEvent } from "./event";
import type { Guard } from "./guard";
import type { Handle, Inject } from "./handler";
import { handlingOf } from "./handled-request";
import type { EmitterOf, HandledRequest, InvalidatorOf, RequestHandlerBuilder } from "./handled-request";
import { fullNameOf, labelOf, unnamedIdentity } from "./identity";
import type { Identity } from "./identity";
import { NO_METADATA, metadataWith } from "./metadata";
import type { Metadata } from "./metadata";
import { requireStep } from "./middleware";
import type {
	Added,
	Middleware,
	NothingAdded,
	RequiresMet,
	Step,
	StepNeedingOptions,
	TakesOptionsFirst,
} from "./middleware";
import type { NothingProvided } from "./module";
import type { ProvidedByRuntime } from "./runtime-provides";

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
	| { readonly reach: "modules"; readonly modules: readonly NamedModule[] };

export type NamedModule = { readonly definition: { readonly name: string } } | { readonly name: string };

interface Definition<K extends RequestKind, I extends z.ZodType, O extends z.ZodType> {
	readonly kind: K;
	readonly identity: Identity;
	readonly input: I;
	readonly output: O;
	readonly idempotencyKey: IdempotencyKey<unknown> | null;
	readonly freshFor: Duration | null;
	readonly settlesNow: boolean;
	readonly invalidates: readonly AnyQuery[] | null;
	readonly visibility: Visibility;
	readonly metadata: Metadata;
}

const VISIBLE_TWICE =
	"{request} already says who may call it: a request is .public() or .callableBy(...) once, never both";
const NO_MODULES = "{request}.callableBy() names no module: name the modules that may call it";
const IN_PROCESS: Visibility = Object.freeze({ reach: "process" });
const PUBLIC: Visibility = Object.freeze({ reach: "public" });

type ProvidedOfRequest<R> =
	R extends Contract<RequestKind, z.ZodType, z.ZodType, KeyStage, infer P, AnyEvent> ? P : never;

type ProvidedInRuntimeOf<R> = ProvidedOfRequest<R> & ProvidedByRuntime;

export class Contract<
	K extends RequestKind,
	I extends z.ZodType,
	O extends z.ZodType,
	Key extends KeyStage,
	P extends object = NothingProvided,
	E extends AnyEvent = never,
> {
	readonly kind: K;
	readonly identity: Identity;
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
		this.identity = definition.identity;
		this.inputSchema = definition.input;
		this.outputSchema = definition.output;
		this.keyPolicy = definition.idempotencyKey;
		this.freshFor = definition.freshFor;
		this.isSettledNow = definition.settlesNow;
		this.invalidated = definition.invalidates;
		this.visibility = definition.visibility;
	}

	get name(): string {
		return fullNameOf(this.identity, `a ${this.kind}`);
	}

	get module(): string | null {
		return this.identity.module;
	}

	input<S extends z.ZodType>(schema: S): Contract<K, S, O, Key, P, E> {
		return new Contract({ ...this.definition, input: schema }, this.keyStage);
	}

	output<S extends z.ZodType>(schema: S): Contract<K, I, S, Key, P, E> {
		return new Contract({ ...this.definition, output: schema }, this.keyStage);
	}

	idempotencyKey(
		this: Contract<"command", I, O, "unkeyed", P, E>,
		key: IdempotencyKey<z.output<I>>,
	): Contract<"command", I, O, "keyed", P, E> {
		return new Contract({ ...this.definition, idempotencyKey: key }, "keyed");
	}

	cache(this: Contract<"query", I, O, Key, P, E>, policy: CachePolicy): Contract<"query", I, O, Key, P, E> {
		return new Contract({ ...this.definition, freshFor: policy.freshFor }, this.keyStage);
	}

	settlesNow(this: Contract<"query", I, O, Key, P, E>): Contract<"query", I, O, Key, P, E> {
		return new Contract({ ...this.definition, settlesNow: true }, this.keyStage);
	}

	metadata(): Metadata;
	metadata(fields: Metadata): Contract<K, I, O, Key, P, E>;
	metadata(fields?: Metadata): Metadata | Contract<K, I, O, Key, P, E> {
		if (fields === undefined) {
			return this.definition.metadata;
		}

		const metadata = metadataWith(this.label, this.definition.metadata, fields);
		return new Contract({ ...this.definition, metadata }, this.keyStage);
	}

	invalidates(
		this: Contract<"command", I, O, Key, P, E>,
		queries: readonly ListedQuery[],
	): Contract<"command", I, O, Key, P, E> {
		const invalidates = queries.map((listed) => (listed instanceof Contract ? listed : listed.request));
		return new Contract({ ...this.definition, invalidates }, this.keyStage);
	}

	public(): Contract<K, I, O, Key, P, E> {
		this.refuseSecondVisibility();
		return new Contract({ ...this.definition, visibility: PUBLIC }, this.keyStage);
	}

	callableBy(...modules: readonly NamedModule[]): Contract<K, I, O, Key, P, E> {
		if (modules.length === 0) {
			throw new Error(NO_MODULES.replace("{request}", this.label));
		}

		this.refuseSecondVisibility();
		const visibility: Visibility = { reach: "modules", modules };
		return new Contract({ ...this.definition, visibility }, this.keyStage);
	}

	inModule(module: string): Contract<K, I, O, Key, P, E> {
		if (this.module !== null) {
			return this;
		}

		const invalidates = this.invalidated?.map((listed) => listed.inModule(module)) ?? null;
		const identity = { ...this.identity, module };
		return new Contract({ ...this.definition, identity, invalidates }, this.keyStage);
	}

	guard<R extends AnyRequest, A extends Added, D extends Inject>(
		this: R,
		step: Guard<InputOf<R>, A, D> & RequiresMet<D, ProvidedInRuntimeOf<R>>,
	): RequestHandlerBuilder<R, ProvidedOfRequest<R>, A>;
	guard(this: AnyRequest, step: StepNeedingOptions): TakesOptionsFirst;
	guard(this: AnyRequest, step: Step | StepNeedingOptions): unknown {
		return handlingOf(this, requireStep(step));
	}

	use<R extends AnyRequest, A extends Added, D extends Inject>(
		this: R,
		step: Middleware<InputOf<R>, A, D> & RequiresMet<D, ProvidedInRuntimeOf<R>>,
	): RequestHandlerBuilder<R, ProvidedOfRequest<R>, A>;
	use(this: AnyRequest, step: StepNeedingOptions): TakesOptionsFirst;
	use(this: AnyRequest, step: Step | StepNeedingOptions): unknown {
		return handlingOf(this, requireStep(step));
	}

	handle<R extends AnyRequest>(
		this: R,
		handle: Handle<R, ProvidedInRuntimeOf<R>, InvalidatorOf<R> & EmitterOf<R>>,
	): HandledRequest<R, ProvidedOfRequest<R>, NothingAdded> {
		return handlingOf<R, ProvidedOfRequest<R>>(this).handle(handle);
	}

	private refuseSecondVisibility(): void {
		if (this.visibility.reach !== "process") {
			throw new Error(VISIBLE_TWICE.replace("{request}", this.label));
		}
	}

	private get label(): string {
		return labelOf(this.identity, `a ${this.kind}`);
	}
}

type ListedQuery = AnyQuery | HandledRequest<AnyQuery, object, Added>;

export interface CommandNeedsIdempotencyKey<
	I extends z.ZodType,
	O extends z.ZodType,
	P extends object = NothingProvided,
	E extends AnyEvent = never,
> {
	readonly identity: Identity;
	readonly name: string;
	input<S extends z.ZodType>(schema: S): CommandNeedsIdempotencyKey<S, O, P, E>;
	output<S extends z.ZodType>(schema: S): CommandNeedsIdempotencyKey<I, S, P, E>;
	invalidates(queries: readonly ListedQuery[]): CommandNeedsIdempotencyKey<I, O, P, E>;
	metadata(fields: Metadata): CommandNeedsIdempotencyKey<I, O, P, E>;
	public(): CommandNeedsIdempotencyKey<I, O, P, E>;
	callableBy(...modules: readonly NamedModule[]): CommandNeedsIdempotencyKey<I, O, P, E>;
	idempotencyKey(key: IdempotencyKey<z.output<I>>): Contract<"command", I, O, "keyed", P, E>;
}

export type Query<I extends z.ZodType, O extends z.ZodType> = Contract<"query", I, O, KeyStage, object, AnyEvent>;
export type Command<I extends z.ZodType, O extends z.ZodType> = Contract<"command", I, O, "keyed", object, AnyEvent>;

export type AnyQuery = Query<z.ZodType, z.ZodType>;
export type AnyCommand = Command<z.ZodType, z.ZodType>;
export type AnyRequest = AnyQuery | AnyCommand;

export type SentOf<R extends AnyRequest> = z.input<R["inputSchema"]>;
export type InputOf<R extends AnyRequest> = z.output<R["inputSchema"]>;
export type ReturnedOf<R extends AnyRequest> = z.input<R["outputSchema"]>;
export type OutputOf<R extends AnyRequest> = z.output<R["outputSchema"]>;
export type InputArgs<R extends AnyRequest> = [SentOf<R>] extends [void] ? [input?: SentOf<R>] : [input: SentOf<R>];

export function query<P extends object = NothingProvided>(): Contract<"query", z.ZodVoid, z.ZodVoid, "keyed", P> {
	return new Contract(definitionOf("query"), "keyed");
}

export function command<P extends object = NothingProvided, E extends AnyEvent = never>(): CommandNeedsIdempotencyKey<
	z.ZodVoid,
	z.ZodVoid,
	P,
	E
> {
	return new Contract<"command", z.ZodVoid, z.ZodVoid, "unkeyed", P, E>(definitionOf("command"), "unkeyed");
}

export function isQuery(request: AnyRequest): request is AnyQuery {
	return request.kind === "query";
}

export function nameOfModule(named: NamedModule): string {
	return "definition" in named ? named.definition.name : named.name;
}

function definitionOf<K extends RequestKind>(kind: K): Definition<K, z.ZodVoid, z.ZodVoid> {
	return {
		kind,
		identity: unnamedIdentity(),
		input: z.void(),
		output: z.void(),
		idempotencyKey: null,
		freshFor: null,
		settlesNow: false,
		invalidates: null,
		visibility: IN_PROCESS,
		metadata: NO_METADATA,
	};
}
