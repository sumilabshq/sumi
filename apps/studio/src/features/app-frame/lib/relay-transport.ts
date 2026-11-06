import type { RemoteTransport } from "@widgetarium/data-framework";
import { APP_CALLER_HEADER } from "./app-caller.js";
import { createFrameRelay } from "./frame-relay.js";
import type { FrameRoute } from "./frame-relay.js";

export function relayTransportOf(routes: readonly FrameRoute[], app: string): RemoteTransport {
	const relay = createFrameRelay(routes);
	return {
		call: ({ request, sent, idempotencyKey, signal }) =>
			relay.answer({
				name: request.name,
				input: sent,
				idempotencyKey,
				signal,
				headers: new Headers({ [APP_CALLER_HEADER]: app }),
			}),
		changes: (hear) => relay.changes(hear),
	};
}
