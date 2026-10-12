import { z } from "zod";

type KeyMaker<In> = { bivariant(input: In): string }["bivariant"];

export type IdempotencyKey<In> = KeyMaker<In> | "per-call" | "none";

interface RequestOf<InS extends z.ZodType, OutS extends z.ZodType> {
	readonly name: string;
	readonly module: string;
	readonly input: InS;
	readonly output: OutS;
}

export interface QueryRequest<InS extends z.ZodType, OutS extends z.ZodType> extends RequestOf<InS, OutS> {
	readonly kind: "query";
}

export interface CommandRequest<InS extends z.ZodType, OutS extends z.ZodType> extends RequestOf<InS, OutS> {
	readonly kind: "command";
	readonly idempotencyKey: IdempotencyKey<z.output<InS>>;
}

export type AnyQuery = QueryRequest<z.ZodType, z.ZodType>;
export type AnyCommand = CommandRequest<z.ZodType, z.ZodType>;
export type AnyRequest = AnyQuery | AnyCommand;

export type SentOf<R extends AnyRequest> = z.input<R["input"]>;
export type InputOf<R extends AnyRequest> = z.output<R["input"]>;
export type ReturnedOf<R extends AnyRequest> = z.input<R["output"]>;
export type OutputOf<R extends AnyRequest> = z.output<R["output"]>;
export type InputArgs<R extends AnyRequest> = [SentOf<R>] extends [void] ? [input?: SentOf<R>] : [input: SentOf<R>];

export interface QueryDraft<InS extends z.ZodType> {
	input<S extends z.ZodType>(schema: S): QueryDraft<S>;
	output<S extends z.ZodType>(schema: S): QueryRequest<InS, S>;
}

export interface CommandDraft<InS extends z.ZodType, OutS extends z.ZodType> {
	input<S extends z.ZodType>(schema: S): CommandDraft<S, OutS>;
	output<S extends z.ZodType>(schema: S): CommandDraft<InS, S>;
	idempotencyKey(key: IdempotencyKey<z.output<InS>>): CommandRequest<InS, OutS>;
}

const REQUEST_NAME = /^([a-z][a-z0-9-]*)\/[a-z][a-z0-9-]*$/;
const BAD_NAME = 'a request is named "<module>/<name>" in kebab case, got "{name}"';

export function query(name: string): QueryDraft<z.ZodVoid> {
	return queryDraftOf(name, moduleOf(name), z.void());
}

export function command(name: string): CommandDraft<z.ZodVoid, z.ZodVoid> {
	return commandDraftOf(name, moduleOf(name), z.void(), z.void());
}

function queryDraftOf<InS extends z.ZodType>(name: string, module: string, input: InS): QueryDraft<InS> {
	return {
		input: (schema) => queryDraftOf(name, module, schema),
		output: (output) => ({ kind: "query", name, module, input, output }),
	};
}

function commandDraftOf<InS extends z.ZodType, OutS extends z.ZodType>(
	name: string,
	module: string,
	input: InS,
	output: OutS,
): CommandDraft<InS, OutS> {
	return {
		input: (schema) => commandDraftOf(name, module, schema, output),
		output: (schema) => commandDraftOf(name, module, input, schema),
		idempotencyKey: (idempotencyKey) => ({ kind: "command", name, module, input, output, idempotencyKey }),
	};
}

function moduleOf(name: string): string {
	const module = REQUEST_NAME.exec(name)?.[1];
	if (module === undefined) throw new Error(BAD_NAME.replace("{name}", name));
	return module;
}
