import type { RemoteTransport } from "@widgetarium/data-framework";

const APP_CALLER_HEADER = "x-sumi-app";
const AGENT_APP = "agent";

// TRADE-OFF: the header name is copied from the studio, which a plugin cannot import
export function calledAsAgent(core: RemoteTransport): RemoteTransport {
	return {
		call: (call) => {
			const headers = new Headers(call.headers);
			headers.set(APP_CALLER_HEADER, AGENT_APP);
			return core.call({ ...call, headers });
		},
		changes: (hear) => core.changes(hear),
	};
}
