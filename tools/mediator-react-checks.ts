import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
	AppProvider,
	OnRefused,
	Slot,
	fakeApp,
	useCommand,
	useOptionalQuery,
	useQuery,
} from "../packages/core/src/mediator/index.ts";
import type { App, CommandHandle, CommandRefusal } from "../packages/core/src/mediator/index.ts";
import { check, waitFor } from "./mediator-check.ts";
import * as fx from "./mediator-fixture.ts";

type AddPageHandle = CommandHandle<{ title: string }, { count: number }>;

const held: { add: AddPageHandle | null } = { add: null };
const refusals: CommandRefusal[] = [];

function drawn(running: App, tree: ReactNode): HTMLElement {
	const host = document.createElement("div");
	document.body.append(host);
	createRoot(host).render(
		h(OnRefused, { value: (refusal) => refusals.push(refusal) }, h(AppProvider, { app: running }, tree)),
	);
	return host;
}

function Slow(): ReactElement {
	return h("b", null, useQuery(fx.SlowQuery).data);
}

function Failing(): ReactElement {
	return h("b", null, useQuery(fx.FailingQuery).data);
}

function OptionalSlow(): ReactElement {
	const slow = useOptionalQuery(fx.SlowQuery);
	return h("i", null, slow.isLoading ? "optional loading" : slow.data);
}

function PageList(): ReactElement {
	held.add = useCommand(fx.AddPageCommand);
	return h("ul", null, useQuery(fx.PagesQuery, { prefix: "" }).data.join(","));
}

const loading = h("span", null, "slot loading");
const failed = (reason: string): ReactNode => h("span", null, `failed: ${reason}`);
const web = (): App => fx.appOn("web", [fx.canvasModule]);

fx.shutGate();
const suspended = drawn(web(), h(Slot, { loading, error: failed }, h(Slow)));
await waitFor(() => suspended.textContent !== "");
check("useQuery suspends: the slot shows loading", suspended.textContent, "slot loading");
fx.gate.open();
check("useQuery draws once the answer arrives", await waitFor(() => suspended.textContent === "slow answer"), true);

const failing = drawn(web(), h(Slot, { loading, error: failed }, h(Failing)));
check(
	"a useQuery failure reaches the slot's error with its reason",
	await waitFor(() => failing.textContent === "failed: the vault is gone"),
	true,
);

fx.shutGate();
const optional = drawn(web(), h(OptionalSlow));
await waitFor(() => optional.textContent !== "");
check("useOptionalQuery draws at once, with no slot, while loading", optional.textContent, "optional loading");
fx.gate.open();
check("useOptionalQuery draws the answer", await waitFor(() => optional.textContent === "slow answer"), true);

const listed = drawn(web(), h(Slot, { loading, error: failed }, h(PageList)));
await waitFor(() => listed.textContent === "Home");
await held.add?.run({ title: "Zeta" });
check("a command re-reads its module's queries", await waitFor(() => listed.textContent === "Home,Zeta"), true);

await held.add?.run({ title: "" });
check(
	"a refusal goes to the one OnRefused handler",
	refusals.map(({ name, ran }) => [name, ran]),
	[["canvas/add-page", false]],
);
await waitFor(() => (held.add?.refusal ?? null) !== null);
check("the handle keeps the refusal", held.add?.refusal?.startsWith("canvas/add-page input"), true);

const designed = drawn(
	fakeApp({ answers: { [fx.PagesQuery.name]: ["Designed"] } }),
	h(Slot, { loading, error: failed }, h(PageList)),
);
check("fakeApp draws a block with given answers", await waitFor(() => designed.textContent === "Designed"), true);
