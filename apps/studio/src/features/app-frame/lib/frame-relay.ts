import { refusalOf } from "@widgetarium/framework";
import type {
	AnyRequest,
	Answer,
	HearChanges,
	ModuleContract,
	RemoteTransport,
	ServedCall,
	ServingServer,
} from "@widgetarium/framework";

export type HeardInvalidation = Parameters<HearChanges>[0][number];

export interface FrameRoute {
	readonly module: ModuleContract;
	readonly transport: RemoteTransport;
	readonly hears: (invalidation: HeardInvalidation) => boolean;
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

export function hearsAll(): boolean {
	return true;
}

export function createFrameRelay(routes: readonly FrameRoute[]): ServingServer {
	const relayed = relayedOf(routes);
	return {
		answer: (call) => answerThrough(relayed, call),
		changes: (hear) => relayChanges(routes, hear),
	};
}

function relayChanges(routes: readonly FrameRoute[], hear: HearChanges): () => void {
	const stops = [...routesByTransport(routes)].map(([transport, held]) => transportChanges(transport, held, hear));
	return () => stops.forEach((stop) => stop());
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

function routesByTransport(routes: readonly FrameRoute[]): ReadonlyMap<RemoteTransport, readonly FrameRoute[]> {
	const grouped = new Map<RemoteTransport, FrameRoute[]>();

	for (const route of routes) {
		grouped.set(route.transport, [...(grouped.get(route.transport) ?? []), route]);
	}

	return grouped;
}

function transportChanges(transport: RemoteTransport, routes: readonly FrameRoute[], hear: HearChanges): () => void {
	return transport.changes((invalidated) => hearOwn(routes, invalidated, hear));
}

function hearOwn(routes: readonly FrameRoute[], invalidated: readonly HeardInvalidation[], hear: HearChanges): void {
	const own = invalidated.filter((invalidation) => routes.some((route) => isHeardBy(route, invalidation)));

	if (own.length > 0) {
		hear(own);
	}
}

function isHeardBy({ module, hears }: FrameRoute, invalidation: HeardInvalidation): boolean {
	return module.requests.some(({ name }) => name === invalidation.query) && hears(invalidation);
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
