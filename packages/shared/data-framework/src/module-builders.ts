import { event } from "./event";
import type { AnyEvent } from "./event";
import type { ModuleWithInjects, ProvidedOf } from "./platform-module";
import { command, query } from "./request";
import { subscriber } from "./subscriber";

export function buildersOf<M extends ModuleWithInjects>() {
	return {
		command: (name: string) => command<ProvidedOf<M>>(name),
		query: (name: string) => query<ProvidedOf<M>>(name),
		subscriber: <E extends AnyEvent>(heard: E) => subscriber<E, ProvidedOf<M>>(heard),
		event,
	};
}
