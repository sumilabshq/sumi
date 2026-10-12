import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { useCommandHandle } from "../packages/core/src/command-handle.ts";
import { AppProvider, OnRefused, app, useCommand } from "../packages/core/src/mediator/index.ts";
import type { CommandAnswer, CommandHandle, CommandRefusal } from "../packages/core/src/mediator/index.ts";
import { check, waitFor } from "./mediator-check.ts";
import * as ex from "./mediator-edge-fixture.ts";
import * as fx from "./mediator-fixture.ts";

const both = app({ modules: [fx.canvasModule, ex.edgeModule], host: fx.hostOn("web") });
const held: {
	flaky: CommandHandle<{ text: string }, void> | null;
	rejecting: CommandHandle<unknown, unknown> | null;
} = { flaky: null, rejecting: null };
const refusals: CommandRefusal[] = [];
const rejecting = Object.assign(async (): Promise<CommandAnswer<unknown>> => Promise.reject(new Error("rejected")), {
	can: () => ({ can: true }) as const,
});

function Handles(): ReactElement {
	held.flaky = useCommand(ex.Flaky);
	held.rejecting = useCommandHandle("edge/rejecting", rejecting);
	return h("i", null, held.rejecting.isRunning ? "running" : "idle");
}

const host = document.createElement("div");
document.body.append(host);
createRoot(host).render(
	h(OnRefused, { value: (refusal) => refusals.push(refusal) }, h(AppProvider, { app: both }, h(Handles))),
);
await waitFor(() => held.flaky !== null);

ex.edge.keys.length = 0;
ex.edge.flakyRefusals = 1;
await held.flaky?.run({ text: "a" });
await held.flaky?.run({ text: "a" });
await held.flaky?.run({ text: "a" });
const [refusedKey, retriedKey, nextKey] = ex.edge.keys;
check("a per-call retry after ran: false reuses its key", refusedKey !== null && refusedKey === retriedKey, true);
check("a per-call run after ok: true makes a new key", nextKey !== null && nextKey !== retriedKey, true);

refusals.length = 0;
check("a rejected run answers a refusal that did not run", await held.rejecting?.run(undefined), {
	ok: false,
	reason: "rejected",
	ran: false,
});
check("a rejected run stops running", await waitFor(() => host.textContent === "idle"), true);
check("a rejected run goes to the refusal handler", refusals, [
	{ name: "edge/rejecting", reason: "rejected", ran: false },
]);

fx.seen.order.length = 0;
const stop = both.queries.subscribe(fx.GetPages, { prefix: "" }, () => {});
await waitFor(() => fx.seen.order.includes("handler"));
const before = fx.seen.order.filter((step) => step === "handler").length;
await both.send(ex.NextTwice, undefined);
check(
	"a command re-reads active queries of every module",
	await waitFor(() => fx.seen.order.filter((step) => step === "handler").length === before + 1),
	true,
);
stop();
