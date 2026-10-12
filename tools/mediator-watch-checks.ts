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

const watchedModule = module({ name: "watched", handlers: [GetCountedHandler] });
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
