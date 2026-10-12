import type { HandlerClass, Middleware } from "./handles";
import type { AnyRequest } from "./request";
import type { Provided } from "./token";

export interface Module {
	readonly name: string;
	readonly requests: readonly AnyRequest[];
	readonly handlers: readonly HandlerClass[];
	readonly provide: readonly Provided[];
	readonly use: readonly Middleware[];
}

export interface ModuleDeclaration {
	readonly name: string;
	readonly requests: readonly AnyRequest[];
	readonly handlers: readonly HandlerClass[];
	readonly provide?: readonly Provided[];
	readonly use?: readonly Middleware[];
}

const NO_PROVIDERS: readonly Provided[] = [];
const NO_MIDDLEWARE: readonly Middleware[] = [];

export function module(declared: ModuleDeclaration): Module {
	return {
		name: declared.name,
		requests: declared.requests,
		handlers: declared.handlers,
		provide: declared.provide ?? NO_PROVIDERS,
		use: declared.use ?? NO_MIDDLEWARE,
	};
}
