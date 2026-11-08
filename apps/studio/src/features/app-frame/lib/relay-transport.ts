import type { RemoteTransport } from "@widgetarium/data-framework";
import { APP_CALLER_HEADER } from "./app-caller.js";
import { createFrameRelay } from "./frame-relay.js";
import type { FrameRoutes } from "./frame-relay.js";

export function relayTransportOf({ routes, ownPrefix }: FrameRoutes, app: string): RemoteTransport {
	const relay = createFrameRelay(routes, ownPrefix);
	return {
		call: ({ name, sent, idempotencyKey, signal }) =>
			relay.answer({
				name,
				input: sent,
				idempotencyKey,
				signal,
				headers: new Headers({ [APP_CALLER_HEADER]: app }),
			}),
		changes: (hear) => relay.changes(hear),
	};
}
