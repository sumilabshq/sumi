import { z } from "zod";
import { app, handlerOf, module, query } from "../packages/core/src/mediator/index.ts";
import { sharedWith } from "../packages/core/src/mediator/shared-with.ts";
import { check, waitFor } from "./mediator-check.ts";
import { hostOn } from "./mediator-fixture.ts";

const counter = { value: 1, listeners: new Set<() => void>(), stopped: 0 };

const GetCounted = query("watched/get-counted").output(z.object({ value: z.number(), tags: z.array(z.string()) }));

class GetCountedHandler extends handlerOf(GetCounted) {
	override async handle(): Promise<{ value: number; tags: string[] }> {
		return { value: counter.value, tags: ["same"] };
	}

	watch(_input: void, changed: () => void): () => void {
		counter.listeners.add(changed);
		return () => {
			counter.stopped += 1;
			counter.listeners.delete(changed);
		};
	}
}

const fresh = { value: 1 };

const GetFresh = query("watched/get-fresh").output(z.object({ value: z.number() }));

class GetFreshHandler extends handlerOf(GetFresh) {
	override async handle(): Promise<{ value: number }> {
		return { value: fresh.value };
	}

	watch(): () => void {
		return () => undefined;
	}
}

const watchedModule = module({ name: "watched", handlers: [GetCountedHandler, GetFreshHandler] });
const running = app({ modules: [watchedModule], host: hostOn("web") });
const key = running.queries.keyOf(GetCounted, undefined);
let heard = 0;
const stop = running.queries.subscribe(GetCounted, undefined, () => (heard += 1));
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

const freshKey = running.queries.keyOf(GetFresh, undefined);
await running.queries.start(GetFresh, undefined).read;
fresh.value = 2;
const stopFresh = running.queries.subscribe(GetFresh, undefined, () => undefined);
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
