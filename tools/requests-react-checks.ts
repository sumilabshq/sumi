import { createElement as h, useLayoutEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
	AppProvider,
	OnRefused,
	Slot,
	app,
	orpcTransport,
	useCommand,
	useOptionalQuery,
	useQuery,
} from "../packages/shared/framework/src/index.ts";
import type { CommandHandle, CommandRefusal, StartedApp } from "../packages/shared/framework/src/index.ts";
import { server } from "../packages/shared/framework/src/server/index.ts";
import { check, waitFor } from "./check-helpers.ts";
import * as fx from "./requests-fixture.ts";

type AddPageHandle = CommandHandle<{ title: string }, { count: number }>;

const held: { add: AddPageHandle | null } = { add: null };
const refusals: CommandRefusal[] = [];
const loading = h("span", null, "slot loading");
const failed = (reason: string): ReactNode => h("span", null, `failed: ${reason}`);

function drawn(started: StartedApp, tree: ReactNode): HTMLElement {
	const host = document.createElement("div");
	document.body.append(host);
	createRoot(host).render(
		h(OnRefused, { value: (refusal) => refusals.push(refusal) }, h(AppProvider, { app: started }, tree)),
	);
	return host;
}

function Slow(): ReactElement {
	return h("b", null, useQuery(fx.SlowQuery).data);
}

function Crashing(): ReactElement {
	return h("b", null, useQuery(fx.CrashQuery).data);
}

function OptionalSlow(): ReactElement {
	const slow = useOptionalQuery(fx.SlowQuery);
	return h("i", null, slow.isLoading ? "optional loading" : slow.data);
}

function PageList(): ReactElement {
	held.add = useCommand(fx.AddPageCommand);
	return h("ul", null, useQuery(fx.PagesQuery, { prefix: "" }).data.join(","));
}

function Count(): ReactElement {
	return h("em", null, String(useQuery(fx.CountQuery).data));
}

const pages = new fx.MemoryPages();
const local = (): StartedApp => app({ modules: [fx.pagesModuleOver(pages)] });

fx.shutGate();
const suspended = drawn(local(), h(Slot, { loading, error: failed }, h(Slow)));
await waitFor(() => suspended.textContent !== "");
check("useQuery suspends: the slot shows its loading", suspended.textContent, "slot loading");
fx.gate.open();
check("useQuery draws once the answer arrives", await waitFor(() => suspended.textContent === "slow answer"), true);

const crashing = drawn(local(), h(Slot, { loading, error: failed }, h(Crashing)));
check(
	"a refused read draws the slot's error with the reason",
	await waitFor(() => crashing.textContent === "failed: cannot read the page"),
	true,
);

fx.shutGate();
const optional = drawn(local(), h(OptionalSlow));
check(
	"useOptionalQuery draws its own loading, never suspends",
	await waitFor(() => optional.textContent === "optional loading"),
	true,
);
fx.gate.open();
check("and its data once read", await waitFor(() => optional.textContent === "slow answer"), true);

const listed = local();
const list = drawn(listed, h(Slot, { loading, error: failed }, h(PageList)));
await waitFor(() => list.textContent === "Home");
check("a list draws", list.textContent, "Home");
fx.shutGate();
const adding = held.add?.run({ title: "Barn" });
await waitFor(() => held.add?.isRunning === true);
check("useCommand says it runs", held.add?.isRunning, true);
fx.gate.open();
check("a command answers through run", await adding, { ok: true, output: { count: 2 } });
check(
	"after a command every query on screen is read again",
	await waitFor(() => list.textContent === "Home,Barn"),
	true,
);

pages.titles.push("Shed");
fx.pagesChanged(pages);
check(
	"a watched query is read again when its handler says it changed",
	await waitFor(() => list.textContent === "Home,Barn,Shed"),
	true,
);

const refused = await held.add?.run({ title: "" });
check("a refused command answers its refusal", refused?.ok, false);
check("and reaches the one refusal handler", refusals.at(-1)?.name, "pages/add-page");

const counted = local();
const firstCommits: string[] = [];
const countHost = document.createElement("div");
document.body.append(countHost);
function CommitProbe(): ReactElement {
	useLayoutEffect(() => {
		firstCommits.push(countHost.textContent);
	}, []);
	return h(Slot, { loading, error: failed }, h(Count));
}
flushSync(() => createRoot(countHost).render(h(AppProvider, { app: counted }, h(CommitProbe))));
check("a settlesNow query draws its answer in the very first commit, never its loading", firstCommits, [
	String(pages.titles.length),
]);

const remoteServer = server({
	modules: [fx.JoinedPagesServerModule],
	env: {},
	host: { authenticate: new fx.HeaderAuthenticate() },
});
const mixed = app({
	modules: [fx.pagesModuleOver(new fx.MemoryPages())],
	server: orpcTransport("http://server.test", { fetch: (request) => remoteServer.fetch(request) }),
});
const policies = (started: StartedApp) =>
	started.queryClient
		.getQueryCache()
		.getAll()
		.map((cached) => ({
			retries: typeof cached.options.retry === "function" ? "when unreachable" : cached.options.retry,
			networkMode: cached.options.networkMode,
			refetchOnWindowFocus: Reflect.get(cached.options, "refetchOnWindowFocus"),
		}));
const mixedHost = drawn(mixed, h(Slot, { loading, error: failed }, h(PageList)));
await waitFor(() => mixedHost.textContent === "Home");
check("a local query gets no retries, no re-read on focus, and runs offline", policies(mixed), [
	{ retries: false, networkMode: "always", refetchOnWindowFocus: false },
]);

const remoteOnly = app({
	modules: [],
	server: orpcTransport("http://server.test", { fetch: (request) => remoteServer.fetch(request) }),
});
const remoteHost = drawn(remoteOnly, h(Slot, { loading, error: failed }, h(PageList)));
await waitFor(() => remoteHost.textContent === "Home");
check(
	"a remote query retries an unreachable server, re-reads on focus, and waits for the network",
	policies(remoteOnly),
	[{ retries: "when unreachable", networkMode: "online", refetchOnWindowFocus: true }],
);

const touchedPages = new fx.MemoryPages();
const touched = app({ modules: [fx.pagesModuleOver(touchedPages)] });
function Both(): ReactElement {
	return h("p", null, `${useQuery(fx.PagesQuery, { prefix: "" }).data.join(",")} / ${useQuery(fx.CountQuery).data}`);
}
const both = drawn(touched, h(Slot, { loading, error: failed }, h(Both)));
await waitFor(() => both.textContent === "Home / 1");
await touched.send(fx.TouchPagesCommand, { title: "Loft" });
check(
	"a command naming .invalidates re-reads only those queries",
	await waitFor(() => both.textContent === "Home,Loft / 1"),
	true,
);
await new Promise((settled) => setTimeout(settled, 50));
check("and the others keep their answer", both.textContent, "Home,Loft / 1");

const reReading = local();
const slowShown = drawn(reReading, h(Slot, { loading, error: failed }, h(Slow)));
await waitFor(() => slowShown.textContent === "slow answer");
const shownWhileReRead: string[] = [];
new window.MutationObserver(() => shownWhileReRead.push(slowShown.textContent)).observe(slowShown, {
	childList: true,
	subtree: true,
	characterData: true,
});
fx.shutGate();
await reReading.send(fx.BumpCommand);
await new Promise((settled) => setTimeout(settled, 50));
fx.gate.open();
await new Promise((settled) => setTimeout(settled, 50));
check(
	"a re-read keeps the previous answer on screen until the new one arrives",
	[shownWhileReRead.some((shown) => shown.includes("slot loading")), slowShown.textContent],
	[false, "slow answer"],
);
