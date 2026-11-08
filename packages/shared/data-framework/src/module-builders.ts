import type { AnyEvent } from "./event";
import type { ModuleWithInjects, ProvidedOf } from "./platform-module";
import { command, query } from "./request";
import { subscriber } from "./subscriber";

export function buildersOf<M extends ModuleWithInjects, E extends AnyEvent = never>() {
	return {
		command: () => command<ProvidedOf<M>, E>(),
		query: () => query<ProvidedOf<M>>(),
		subscriber: <H extends AnyEvent>(heard: H) => subscriber<H, ProvidedOf<M>, E>(heard),
	};
}
