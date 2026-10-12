import { MADE_BY_HANDLER_OF } from "./handles";
import type { Handles, RequestContext } from "./handles";
import type { AnyRequest, InputOf, ReturnedOf } from "./request";

export function handlerOf<const R extends AnyRequest>(request: R) {
	abstract class RequestHandler implements Handles<R> {
		static readonly request: R = request;
		static readonly [MADE_BY_HANDLER_OF] = true as const;
		abstract handle(input: InputOf<R>, ctx: RequestContext): Promise<ReturnedOf<R>>;
	}
	return RequestHandler;
}
