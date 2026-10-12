import { MemoryDoneKeys, app } from "../packages/core/src/mediator/index.ts";
import type { CommandAnswer } from "../packages/core/src/mediator/index.ts";
import { check } from "./mediator-check.ts";
import * as ex from "./mediator-edge-fixture.ts";
import { hostOn } from "./mediator-fixture.ts";

const { edge } = ex;
const edged = app({ modules: [ex.edgeModule], host: hostOn("web") });

check("a throw inside the handler is ran: true", await edged.send(ex.WriteThenThrow, { id: "a" }), {
	ok: false,
	reason: "failed after the write",
	ran: true,
});
await edged.send(ex.WriteThenThrow, { id: "a" });
check("a throw inside the handler keeps its key: a repeat does not write again", edge.written, 1);
check("a throw before the handler is ran: false", await edged.send(ex.ThrowBeforeHandler, undefined), {
	ok: false,
	reason: "refused before the handler",
	ran: false,
});
check("the handler never ran when middleware threw", edge.written, 1);

check("a throwing key function is a refusal", await edged.send(ex.KeyBroken, { id: "a" }), {
	ok: false,
	reason: "the key function broke",
	ran: false,
});
check("a throwing input transform is a refusal", await edged.send(ex.TransformBroken, { id: "a" }), {
	ok: false,
	reason: "the transform broke",
	ran: false,
});
const broken = edged.queries.start(ex.TransformBroken, { id: "a" });
await broken.read;
check(
	"a query with a throwing transform settles as failed, never loading forever",
	edged.queries.peek(edged.queries.keyOf(ex.TransformBroken, { id: "a" }))?.status,
	"failed",
);

check(
	"a second next() answers the same promise",
	[(await edged.send(ex.NextTwice, undefined)).ok, edge.sameNext],
	[true, true],
);
check("a second next() does not run the handler again", edge.twice, 1);

edge.keys.length = 0;
await edged.send(ex.Mutated, { title: "original" });
check("middleware cannot rewrite the input the handler gets", edge.keys, ["original"]);

check('"per-call" sent with no key is refused', await edged.send(ex.Flaky, { text: "a" }), {
	ok: false,
	reason: 'edge/flaky is "per-call": send it with options.idempotencyKey',
	ran: false,
});

edge.reports.length = 0;
await edged.send(ex.ThrowBeforeHandler, undefined);
await edged.send(ex.WriteThenThrow, { id: "b" });
check(
	"every failure reaches the provided reportFailure once",
	edge.reports.map(({ source, ran }) => [source, ran]),
	[
		["edge/throw-before-handler", false],
		["edge/write-then-throw", true],
	],
);

const counted = { runs: 0 };
const answered = async (ran: boolean): Promise<CommandAnswer<unknown>> => {
	counted.runs += 1;
	return { ok: false, reason: "no", ran };
};
const kept = new MemoryDoneKeys(2);
await kept.once("a", () => answered(true));
await kept.once("b", () => answered(true));
await kept.once("a", () => answered(true));
check("done keys answer a kept key without running", counted.runs, 2);
await kept.once("c", () => answered(true));
await kept.once("a", () => answered(true));
check("done keys forget the oldest past their cap", counted.runs, 4);
