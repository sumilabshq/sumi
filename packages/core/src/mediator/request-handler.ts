import type { CommandAnswer } from "../gateway/run-handler";
import { buildingNow, isBuilding } from "./building";
import type { Building } from "./building";
import type { Handles, RequestContext, Watching } from "./handles";
import type { AnyRequest, InputOf, OutputOf, ReturnedOf, SentOf } from "./request";
import { NOT_WATCHED } from "./sends";
import type { SendOptions } from "./sends";
import type { Token } from "./token";

const INJECTED_LATE =
	"{handler} injects {token} after it was built: inject in a field initialiser, `private readonly x = this.inject({token})`, so app() checks it at start";

export abstract class RequestHandler<R extends AnyRequest> implements Handles<R> {
	private readonly building: Building = buildingNow(this.constructor.name);

	abstract handle(input: InputOf<R>, ctx: RequestContext): Promise<ReturnedOf<R>>;

	watch(_watching: Watching<R>): () => void {
		return NOT_WATCHED;
	}

	protected inject<T>(wanted: Token<T>): T {
		if (!isBuilding(this.building))
			throw new Error(INJECTED_LATE.replace("{handler}", this.constructor.name).split("{token}").join(wanted.name));
		return this.building.inject(wanted);
	}

	protected send<Q extends AnyRequest>(
		sent: Q,
		input: SentOf<Q>,
		options?: SendOptions,
	): Promise<CommandAnswer<OutputOf<Q>>> {
		return this.building.sender.send(sent, input, options);
	}
}
