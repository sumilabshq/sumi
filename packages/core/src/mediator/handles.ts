import type { AnyRequest, InputOf, ReturnedOf } from "./request";

export interface AppHost {
	is(platform: string): boolean;
}

export interface RequestContext {
	readonly idempotencyKey: string | null;
	readonly signal: AbortSignal;
	readonly host: AppHost;
}

export interface Handles<R extends AnyRequest> {
	handle(input: InputOf<R>, ctx: RequestContext): Promise<ReturnedOf<R>>;
}

export interface HandlerClass<R extends AnyRequest = AnyRequest> {
	readonly name: string;
	readonly request: R;
	new (): Handles<R>;
}

export interface RequestCall {
	readonly request: AnyRequest;
	readonly input: unknown;
	readonly ctx: RequestContext;
}

export type Middleware = (call: RequestCall, next: () => Promise<unknown>) => Promise<unknown>;
