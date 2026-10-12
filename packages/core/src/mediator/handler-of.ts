import type { Handles, RequestContext } from "./handles";
import type { AnyRequest, InputOf, ReturnedOf } from "./request";

export function handlerOf<const R extends AnyRequest>(request: R) {
	abstract class RequestHandler implements Handles<R> {
		static readonly request: R = request;
		static readonly isMadeByHandlerOf = true as const;
		abstract handle(input: InputOf<R>, ctx: RequestContext): Promise<ReturnedOf<R>>;
	}
	return RequestHandler;
}
