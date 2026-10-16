import { z } from "zod";
import { handlerOf, module, query } from "../packages/core/src/mediator/index.ts";
import type { Watching } from "../packages/core/src/mediator/index.ts";
import { sharedWith } from "../packages/core/src/mediator/shared-with.ts";
import { check, waitFor } from "./mediator-check.ts";
import { appOn } from "./mediator-fixture.ts";

const counter = { value: 1, listeners: new Set<() => void>(), stopped: 0 };

const CountedQuery = query("watched/counted").output(z.object({ value: z.number(), tags: z.array(z.string()) }));

class CountedQueryHandler extends handlerOf(CountedQuery) {
	override async handle(): Promise<{ value: number; tags: string[] }> {
		return { value: counter.value, tags: ["same"] };
	}

	override watch({ changed }: Watching<typeof CountedQuery>): () => void {
		counter.listeners.add(changed);
		return () => {
			counter.stopped += 1;
			counter.listeners.delete(changed);
		};
	}
}

const fresh = { value: 1 };

const FreshQuery = query("watched/fresh").output(z.object({ value: z.number() }));

class FreshQueryHandler extends handlerOf(FreshQuery) {
	override async handle(): Promise<{ value: number }> {
		return { value: fresh.value };
	}

	override watch(): () => void {
		return () => undefined;
	}
}

const Unwatched = query("watched/unwatched").output(z.number());

class UnwatchedHandler extends handlerOf(Unwatched) {
	override async handle(): Promise<number> {
		return 1;
	}
}

const watchedModule = module({ name: "watched", handlers: [CountedQueryHandler, FreshQueryHandler, UnwatchedHandler] });
const running = appOn("web", [watchedModule]);
check(
	"a handler that does not override watch is not watched: the base answers the not-watched stop",
	running.watch(Unwatched, undefined, () => undefined) === running.watch(Unwatched, undefined, () => undefined),
	true,
);
const key = running.queries.keyOf(CountedQuery, undefined);
let heard = 0;
const stop = running.queries.subscribe(CountedQuery, undefined, () => (heard += 1));
await waitFor(() => running.queries.peek(key)?.status === "ready");
const first = running.queries.peek(key)?.data;
check("a query whose handler watches is watched while someone listens", counter.listeners.size, 1);

for (const changed of [...counter.listeners]) changed();
await new Promise((settled) => setTimeout(settled, 5));
check(
	"a change that leaves the answer equal keeps the same data and tells no one",
	[running.queries.peek(key)?.data === first, heard],
	[true, 1],
);

counter.value = 2;
for (const changed of [...counter.listeners]) changed();
await waitFor(() => heard === 2);
const second = running.queries.peek(key)?.data;
check(
	"a change the handler watches reads the query again",
	[heard, JSON.stringify(second)],
	[2, '{"value":2,"tags":["same"]}'],
);
check(
	"and the parts of the answer that did not change keep their identity",
	Reflect.get(Object(second), "tags") === Reflect.get(Object(first), "tags"),
	true,
);

stop();
check("the last listener leaving stops the watch", [counter.listeners.size, counter.stopped], [0, 1]);

const kept = { list: [{ id: 1 }, { id: 2 }], name: "a" };
const shared = sharedWith(kept, { list: [{ id: 1 }, { id: 3 }], name: "a" });
check(
	"structural sharing keeps every equal branch and replaces only the changed one",
	[shared === kept, Reflect.get(Object(Reflect.get(Object(shared), "list")), 0) === kept.list[0]],
	[false, true],
);

const freshKey = running.queries.keyOf(FreshQuery, undefined);
await running.queries.start(FreshQuery, undefined).read;
fresh.value = 2;
const stopFresh = running.queries.subscribe(FreshQuery, undefined, () => undefined);
await waitFor(() => JSON.stringify(running.queries.peek(freshKey)?.data) === '{"value":2}');
check(
	"a change between the first read and the watch attaching is read once the watch attaches",
	running.queries.peek(freshKey)?.data,
	{ value: 2 },
);
stopFresh();

const renamedFrom = { kept: undefined };
check(
	"structural sharing never keeps a record whose keys were renamed",
	sharedWith(renamedFrom, { renamed: undefined }) === renamedFrom,
	false,
);
