import type { AnyHost } from "./platform";
import type { AnyRequest, InputOf, ReturnedOf } from "./request";

export interface RequestContext {
	readonly idempotencyKey: string | null;
	readonly signal: AbortSignal;
	readonly host: AnyHost;
}

export interface Watching<R extends AnyRequest> {
	readonly input: InputOf<R>;
	readonly changed: () => void;
}

export interface Handles<R extends AnyRequest> {
	handle(input: InputOf<R>, ctx: RequestContext): Promise<ReturnedOf<R>>;
	watch(watching: Watching<R>): () => void;
}

export interface HandlerClass<R extends AnyRequest = AnyRequest> {
	readonly name: string;
	readonly request: R;
	readonly isMadeByHandlerOf: true;
	new (): Handles<R>;
}

export interface RequestCall {
	readonly request: AnyRequest;
	readonly input: unknown;
	readonly ctx: RequestContext;
}

export type Middleware = (call: RequestCall, next: () => Promise<unknown>) => Promise<unknown>;
