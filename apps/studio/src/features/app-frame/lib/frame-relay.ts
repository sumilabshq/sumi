import { FileSystemModule, PlacesModule, TerminalModule } from "@sumi/contract";
import { refusalOf } from "@widgetarium/core/requests";
import type { AnyRequest, RemoteTransport, ServingServer } from "@widgetarium/core/requests";

const NOT_RELAYED = "{name} is not a request Sumi offers to apps";

const RELAYED: ReadonlyMap<string, AnyRequest> = new Map(
	[FileSystemModule, TerminalModule, PlacesModule]
		.flatMap((module) => module.requests)
		.map((request) => [request.name, request]),
);

export function createFrameRelay(core: RemoteTransport): ServingServer {
	return {
		answer: ({ name, input, idempotencyKey, signal, headers }) => {
			const request = RELAYED.get(name);

			if (request === undefined) {
				return Promise.resolve(refusalOf("not-found", NOT_RELAYED.replace("{name}", name)));
			}

			return core.call({
				request,
				sent: input,
				idempotencyKey,
				signal,
				headers,
			});
		},
		changes: (hear) =>
			core.changes((invalidated) => {
				const relayed = invalidated.filter(({ query }) => RELAYED.has(query));

				if (relayed.length > 0) {
					hear(relayed);
				}
			}),
	};
}
