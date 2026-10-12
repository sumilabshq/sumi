import type { HandlerClass, Handles, Middleware } from "./handles";
import type { AnyRequest } from "./request";
import type { Providers } from "./token";

export interface Module {
	readonly name: string;
	readonly requests: readonly AnyRequest[];
	readonly handlers: readonly HandlerClass[];
	readonly provide: Providers;
	readonly use: readonly Middleware[];
}

export interface ModuleDeclaration<H extends readonly HandlerClass[]> {
	readonly name: string;
	readonly requests: readonly AnyRequest[];
	readonly handlers: H & HandlersMatching<H>;
	readonly provide?: Providers;
	readonly use?: readonly Middleware[];
}

type HandlersMatching<H extends readonly HandlerClass[]> = {
	readonly [K in keyof H]: H[K] extends { readonly request: infer R extends AnyRequest; new (): infer Made }
		? Made extends Handles<R>
			? H[K]
			: HandlerOfAnotherRequest<R>
		: H[K];
};

interface HandlerOfAnotherRequest<R extends AnyRequest> {
	readonly request: R;
	readonly "the instance handles a different request than its static request": never;
}

const NO_PROVIDERS: Providers = {};
const NO_MIDDLEWARE: readonly Middleware[] = [];

export function module<const H extends readonly HandlerClass[]>(declared: ModuleDeclaration<H>): Module {
	return {
		name: declared.name,
		requests: declared.requests,
		handlers: declared.handlers,
		provide: declared.provide ?? NO_PROVIDERS,
		use: declared.use ?? NO_MIDDLEWARE,
	};
}
