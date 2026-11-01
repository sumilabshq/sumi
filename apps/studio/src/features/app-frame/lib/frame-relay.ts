import { refusalOf } from "@widgetarium/core/requests";
import type {
	AnyRequest,
	Answer,
	HearChanges,
	ModuleContract,
	RemoteTransport,
	ServedCall,
	ServingServer,
} from "@widgetarium/core/requests";

export interface FrameRoute {
	readonly module: ModuleContract;
	readonly transport: RemoteTransport;
}

export interface FrameOpened {
	readonly app: string;
	readonly tabId: string;
}

export interface FrameRoutes {
	readonly routes: readonly FrameRoute[];
	release(): void;
}

export type FrameRoutesFor = (frame: FrameOpened) => Promise<FrameRoutes>;

interface Relayed {
	readonly request: AnyRequest;
	readonly transport: RemoteTransport;
}

const NOT_RELAYED = "{name} is not a request Sumi offers to apps";

export function createFrameRelay(routes: readonly FrameRoute[]): ServingServer {
	const relayed = relayedOf(routes);
	return {
		answer: (call) => answerThrough(relayed, call),
		changes: (hear) => {
			const stops = routes.map((route) => routeChanges(route, hear));
			return () => stops.forEach((stop) => stop());
		},
	};
}

function answerThrough(
	relayed: ReadonlyMap<string, Relayed>,
	{ name, input, idempotencyKey, signal, headers }: ServedCall,
): Promise<Answer<unknown>> {
	const held = relayed.get(name);

	if (held === undefined) {
		return Promise.resolve(refusalOf("not-found", NOT_RELAYED.replace("{name}", name)));
	}

	return held.transport.call({
		request: held.request,
		sent: input,
		idempotencyKey,
		signal,
		headers,
	});
}

function routeChanges({ module, transport }: FrameRoute, hear: HearChanges): () => void {
	const queries = new Set(module.requests.map(({ name }) => name));
	return transport.changes((invalidated) => {
		const own = invalidated.filter(({ query }) => queries.has(query));

		if (own.length > 0) {
			hear(own);
		}
	});
}

function relayedOf(routes: readonly FrameRoute[]): ReadonlyMap<string, Relayed> {
	return new Map(
		routes.flatMap(({ module, transport }) =>
			module.requests.map((request) => [
				request.name,
				{
					request,
					transport,
				},
			]),
		),
	);
}
