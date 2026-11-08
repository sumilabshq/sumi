import { refusalOf, wireNameOf } from "@widgetarium/data-framework";
import type {
	AnyRequest,
	Answer,
	HearChanges,
	ModuleContract,
	ServerRuns,
	RemoteTransport,
	ServedCall,
	Answering,
} from "@widgetarium/data-framework";

export type HeardInvalidation = Parameters<HearChanges>[0][number];

export interface FrameRoute {
	readonly module: ModuleContract<ServerRuns>;
	readonly prefix?: string | null;
	readonly transport: RemoteTransport;
	readonly hears: (invalidation: HeardInvalidation) => boolean;
}

export interface FrameOpened {
	readonly app: string;
	readonly tabId: string;
}

export interface FrameRoutes {
	readonly routes: readonly FrameRoute[];
	readonly ownPrefix: string | null;
	release(): void;
}

export type FrameRoutesFor = (frame: FrameOpened) => Promise<FrameRoutes>;

interface Relayed {
	readonly name: string;
	readonly prefix: string | null;
	readonly request: AnyRequest;
	readonly transport: RemoteTransport;
}

const NOT_RELAYED = "{name} is not a request Sumi offers to apps";

export function hearsAll(): boolean {
	return true;
}

export function createFrameRelay(routes: readonly FrameRoute[], ownPrefix: string | null = null): Answering {
	const relayed = relayedOf(routes);
	return {
		answer: (call) => answerThrough(pickedOf(relayed.get(call.name) ?? [], ownPrefix), call),
		changes: (hear) => relayChanges(routes, hear),
	};
}

function relayChanges(routes: readonly FrameRoute[], hear: HearChanges): () => void {
	const stops = [...routesByTransport(routes)].map(([transport, held]) => transportChanges(transport, held, hear));
	return () => stops.forEach((stop) => stop());
}

function pickedOf(candidates: readonly Relayed[], ownPrefix: string | null): Relayed | undefined {
	const own = ownPrefix === null ? undefined : candidates.find(({ prefix }) => prefix === ownPrefix);
	const unprefixed = candidates.find(({ prefix }) => prefix === null);
	return own ?? unprefixed ?? (candidates.length === 1 ? candidates[0] : undefined);
}

function answerThrough(
	held: Relayed | undefined,
	{ name, input, idempotencyKey, signal, headers }: ServedCall,
): Promise<Answer<unknown>> {
	if (held === undefined) {
		return Promise.resolve(refusalOf("not-found", NOT_RELAYED.replace("{name}", name)));
	}

	return held.transport.call({
		name: held.name,
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

function relayedOf(routes: readonly FrameRoute[]): ReadonlyMap<string, readonly Relayed[]> {
	const grouped = new Map<string, Relayed[]>();

	for (const { module, transport, prefix = null } of routes) {
		for (const request of module.requests) {
			const relayed = {
				name: wireNameOf(prefix, request.name),
				prefix,
				request,
				transport,
			};
			grouped.set(request.name, [...(grouped.get(request.name) ?? []), relayed]);
		}
	}

	return grouped;
}
