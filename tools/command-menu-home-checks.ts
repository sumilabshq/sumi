import { PluginAppsModule } from "./plugin-apps-fixture.ts";
import { runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Answer } from "../packages/shared/data-framework/src/index.ts";
import { appHost as appHostModule } from "../plugins/tabs/navigation/data/app-host/generated/module.ts";
import { appHost } from "../plugins/tabs/navigation/data/app-host/generated/contract.ts";
import { browser } from "../packages/domain/browser/generated/module.ts";
import { layout } from "../packages/state/layout/generated/module.ts";
import { workspaces as workspacesModule } from "../packages/domain/workspaces/generated/module.ts";
import { PLUGIN_WINDOW_MODULES } from "./command-menu-fixture.ts";
import { commandMenu } from "../plugins/command-menu/data/command-menu/generated/contract.ts";
import type { Intent } from "../plugins/command-menu/data/command-menu/generated/contract.ts";
import { placesOver } from "./places-fixture.ts";
import { check, tally } from "./check-helpers.ts";

type Place = "here" | "new-tab" | "new-window";

const studio = runtime()
	.modules(browser, layout, workspacesModule, appHostModule, PluginAppsModule, ...PLUGIN_WINDOW_MODULES)
	.imports(...placesOver())
	.start({ platform: "browser", scope: { workspaceId: "studio" } });

console.info = () => undefined;

function ok<T>(answer: Answer<T>): T {
	if (!answer.ok) {
		throw new Error(answer.reason);
	}

	return answer.output;
}

async function stripIds(): Promise<readonly string[]> {
	const sidebar = ok(await studio.send(appHost.tabs.tabsSidebar));
	return sidebar.sections.flatMap(({ entries }) => entries.flatMap((entry) => (entry.kind === "tab" ? [entry.tab.id] : [])));
}

async function openedHome(): Promise<string> {
	return ok(await studio.send(appHost.tabActions.openTab, { app: "home" })).id;
}

interface FromHome {
	readonly homeTabId: string;
	readonly homeAt: number;
	readonly chatId: string | null;
}

async function fromHome(intent: Intent, place: Place): Promise<FromHome> {
	const homeTabId = await openedHome();
	ok(await studio.send(appHost.tabActions.openTab, { app: "canvas", show: false }));
	const homeAt = (await stripIds()).indexOf(homeTabId);
	const done = ok(await studio.send(commandMenu.doing.runHomeIntent, { intent, homeTabId, place }));
	return {
		homeTabId,
		homeAt,
		chatId: done.chatId,
	};
}

async function shownTabId(): Promise<string | null> {
	return ok(await studio.send(appHost.tabs.heldTabs)).shownTabId;
}

async function appInPlaceChecks(): Promise<void> {
	const { homeTabId, homeAt } = await fromHome({ do: "open-app", app: "terminal", title: "Terminal" }, "here");
	const after = await stripIds();
	const held = ok(await studio.send(appHost.tabs.heldTabs)).tabs.find(({ id }) => id === homeTabId);
	check(
		"an app picked on Home turns Home's tab into the app in its place, like a browser tab",
		[after[homeAt], held?.app, await shownTabId()],
		[homeTabId, "terminal", homeTabId],
	);
}

async function chatInPlaceChecks(): Promise<void> {
	const { homeTabId, homeAt, chatId } = await fromHome({ do: "run", command: "new-chat" }, "here");
	const after = await stripIds();
	check(
		"Sumi Chat picked on Home makes a chat in Home's place and closes Home",
		[after.includes(homeTabId), chatId === null ? -1 : after.indexOf(chatId)],
		[false, homeAt],
	);
}

async function newTabChecks(): Promise<void> {
	const { homeTabId } = await fromHome({ do: "open-app", app: "terminal", title: "Terminal" }, "new-tab");
	check("an app opened from Home in a new tab keeps Home", (await stripIds()).includes(homeTabId), true);
}

ok(await studio.send(appHost.tabs.restore));
await appInPlaceChecks();
await chatInPlaceChecks();
await newTabChecks();

if (tally.failed > 0) {
	console.log(`command menu home: ${tally.failed} failed`);
	process.exit(1);
}

console.log("command menu home: all checks passed");
process.exit(0);
