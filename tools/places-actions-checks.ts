import { runtime, orpcTransport } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { dataFrameworkMiddleware } from "../packages/shared/data-framework/src/server/index.ts";
import {
	AppTabQuery,
	PlacesModule,
	PressAppActionCommand,
	RecordAppPageCommand,
	TakeActionPressCommand,
} from "../packages/state/places/index.ts";
import { PlacesModule as RunnablePlacesModule } from "../packages/state/places/module.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../packages/state/places/gateways/windows/memory.gateway.ts";
import { APP_CALLER_HEADER, AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally } from "./check-helpers.ts";
import { placedTabsOf } from "./places-fixture.ts";

const tabs = new MemoryTabsGateway(
	placedTabsOf({
		tabs: [
			{ id: "t1", app: "tasks", pageId: null, label: null, lastAddress: "" },
			{ id: "n1", app: "notes", pageId: null, label: null, lastAddress: "" },
		],
		shownId: "t1",
		minted: 2,
		closed: [],
	}),
);
const served = dataFrameworkMiddleware(
	runtime()
		.modules(RunnablePlacesModule({ injects: { windows: new MemoryWindowsGateway({ windows: [] }), tabs } }))
		.start({ platform: "server", env: {} }),
	{ authenticate: new AppCallerAuthenticate() },
);

function placesAs(id: string | null): Runtime {
	const headers = (): Record<string, string> => (id === null ? {} : { [APP_CALLER_HEADER]: id });
	return runtime()
		.imports(PlacesModule({ over: orpcTransport("http://places.test", { fetch: served.fetch, headers }) }))
		.start();
}

const tasks = placesAs("tasks");
const notes = placesAs("notes");
const studio = placesAs(null);

async function actionsOf(): Promise<unknown> {
	const answer = await studio.send(AppTabQuery, { id: "t1" });
	return answer.ok ? (answer.output.actions ?? []).map(({ id }) => id) : answer.reason;
}

async function pressesOf(): Promise<unknown> {
	const answer = await tasks.send(AppTabQuery, { id: "t1" });
	return answer.ok ? (answer.output.presses ?? []).map(({ action }) => action) : answer.reason;
}

async function recordChecks(): Promise<void> {
	await tasks.send(RecordAppPageCommand, {
		id: "t1",
		actions: [
			{ id: "open-chat", label: "Open chat", icon: "message-square" },
			{ id: "archive", label: "Archive", icon: "archive", isOff: true },
		],
	});
	check("an app records the actions its tab's header shows", await actionsOf(), ["open-chat", "archive"]);
	await tasks.send(RecordAppPageCommand, { id: "t1", title: "Board" });
	check("a record without actions keeps them", await actionsOf(), ["open-chat", "archive"]);
	const foreign = await tasks.send(RecordAppPageCommand, {
		id: "n1",
		actions: [{ id: "x", label: "X", icon: "x" }],
	});
	check("an app cannot record actions in a tab it does not hold", foreign.ok, false);
}

async function pressChecks(): Promise<void> {
	const byApp = await tasks.send(PressAppActionCommand, { tab: "t1", action: "open-chat" });
	check("an app cannot press its own actions: only the shell presses", byApp.ok, false);
	const unknown = await studio.send(PressAppActionCommand, { tab: "t1", action: "delete" });
	check("a press of an action the tab does not show is refused", unknown.ok, false);
	const off = await studio.send(PressAppActionCommand, { tab: "t1", action: "archive" });
	check("a press of an action that is off is refused", off.ok, false);
	await studio.send(PressAppActionCommand, { tab: "t1", action: "open-chat" });
	await studio.send(PressAppActionCommand, { tab: "t1", action: "open-chat" });
	check("a shell press waits in the tab for its app, a repeat replaces it", await pressesOf(), ["open-chat"]);
	const moved = await notes.send(RecordAppPageCommand, { id: "n1", title: "Notes" });
	check("another tab's page is recorded", moved.ok, true);
	check("a press survives another tab's move", await pressesOf(), ["open-chat"]);
	const read = await tasks.send(AppTabQuery, { id: "t1" });
	const press = read.ok ? (read.output.presses?.[0]?.id ?? "") : "";
	const stolen = await notes.send(TakeActionPressCommand, { id: "t1", press });
	check("another app cannot take the press", stolen.ok, false);
	const taken = await tasks.send(TakeActionPressCommand, { id: "t1", press });
	check("the app takes the press once", taken.ok ? taken.output.action : taken.reason, "open-chat");
	const twice = await tasks.send(TakeActionPressCommand, { id: "t1", press });
	check("a taken press cannot be taken again", twice.ok, false);
	check("nothing waits after the press is taken", await pressesOf(), []);
}

console.info = () => undefined;
await recordChecks();
await pressChecks();
console.log(tally.failed ? `places actions: ${tally.failed} check(s) failed` : "places actions: all checks passed");
process.exit(tally.failed ? 1 : 0);
