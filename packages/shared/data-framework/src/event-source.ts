import type { Token } from "./handler";
import type { Provided } from "./module";

export interface SourceContext {
	readonly provided: Provided;
}

export type Fire = (payload?: unknown) => void;

export interface EventSource {
	readonly label: string;
	listen(context: SourceContext, fire: Fire): () => void;
}

type Attach<G> = (gateway: G, fire: Fire) => () => void;

const NO_GATEWAY = "{source} needs a {gateway}, which the module that emits it does not provide";

export function gatewayEvent<G extends object>(gateway: Token<G>, attach: Attach<G>): EventSource {
	const label = `gatewayEvent(${gateway.name})`;
	return {
		label,
		listen({ provided }, fire) {
			const held = Object.values(provided).find((value): value is G => value instanceof gateway);

			if (held === undefined) {
				throw new Error(NO_GATEWAY.replace("{source}", label).replace("{gateway}", gateway.name));
			}

			return attach(held, fire);
		},
	};
}

export function windowEvent(type: string): EventSource {
	return {
		label: `windowEvent(${type})`,
		listen(_context, fire) {
			const heard = (event: Event): void => fire(payloadOf(event));
			window.addEventListener(type, heard);
			return () => window.removeEventListener(type, heard);
		},
	};
}

export function tauriEvent(name: string): EventSource {
	return {
		label: `tauriEvent(${name})`,
		listen(_context, fire) {
			const unlistened = import("@tauri-apps/api/event").then(({ listen }) =>
				listen<unknown>(name, ({ payload }) => fire(payload)),
			);
			return () => void unlistened.then((unlisten) => unlisten());
		},
	};
}

function payloadOf(event: Event): unknown {
	if (event instanceof MessageEvent) {
		return event.data;
	}

	return event instanceof CustomEvent ? event.detail : undefined;
}
