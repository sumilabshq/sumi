import type { AnyRequest } from "./request";
import { RequestHandler } from "./request-handler";

export type HandlerOf<R extends AnyRequest> = (abstract new () => RequestHandler<R>) & {
	readonly request: R;
	readonly isMadeByHandlerOf: true;
};

export function handlerOf<const R extends AnyRequest>(request: R): HandlerOf<R> {
	abstract class HandlerOfRequest extends RequestHandler<R> {
		static readonly request: R = request;
		static readonly isMadeByHandlerOf = true as const;
	}
	return HandlerOfRequest;
}
