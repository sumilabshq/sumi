import { orpcTransport, runtime } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { dataFrameworkMiddleware } from "../packages/shared/data-framework/src/server/index.ts";
import { apps } from "../plugins/apps/data/apps/generated/contract.ts";
import { apps as appsModule } from "../plugins/apps/data/apps/generated/module.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { navigation as navigationModule } from "../plugins/tabs/navigation/data/navigation/generated/module.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { PlacedTabsSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { APP_CALLER_HEADER, AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { artboards as artboardsModule } from "../plugins/canvas/data/artboards/generated/module.ts";
import { artboards } from "../plugins/canvas/data/artboards/generated/contract.ts";
import { appTabsInChatsOf } from "../plugins/tabs/navigation/data/navigation/features/tab-facts/lib/app-tabs-in-chats.ts";
import { emptyMoment, openTab, placeTab } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import type { HostTabsMoment } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import { WORKSPACE_LIST } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-lists.ts";
import { freeCanvasIdOf } from "../plugins/canvas/src/features/canvas-home/lib/free-canvas-id.ts";
import { gridShapeOf, shownSpanOf, wantedSpanOf } from "../plugins/canvas/src/features/canvas-home/lib/grid-span.ts";
import { cardMetaOf } from "../plugins/canvas/src/features/canvas-home/lib/card-meta.ts";
import { BUILT_IN_APPS, builtInPlacedApps } from "./placed-apps-fixture.ts";

let failed = 0;
console.info = () => undefined;

function check(name: string, seen: unknown, wanted: unknown): void {
	const isOk = JSON.stringify(seen) === JSON.stringify(wanted);
	failed += isOk ? 0 : 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${name}${isOk ? "" : ` — saw ${JSON.stringify(seen)}, wanted ${JSON.stringify(wanted)}`}`);
}

async function sent<T>(answer: Promise<{ ok: true; output: T } | { ok: false; reason: string }>): Promise<T> {
	const read = await answer;

	if (!read.ok) {
		throw new Error(read.reason);
	}

	return read.output;
}

const core = runtime()
	.modules(artboardsModule({}))
	.start({
		platform: "server",
		env: {},
		scope: { workspaceId: "canvas-home-checks" },
	});

await sent(core.send(artboards.canvases.createCanvas, { canvasId: "tab-1" }));
await sent(core.send(artboards.canvases.renameCanvas, { canvasId: "tab-1", title: "Sumi header" }));
await sent(core.send(artboards.canvases.createCanvas, { canvasId: "tab-1" }));
const listed = await sent(core.send(artboards.canvases.getCanvases, {}));
check("a second create of one canvas creates nothing and keeps its name", listed.map(({ title }) => title), ["Sumi header"]);
check("a rename stamps the edit time", (listed[0]?.editedAt ?? 0) > 0, true);

const editedAt = listed[0]?.editedAt ?? 0;
await new Promise((settle) => setTimeout(settle, 5));
await sent(core.send(artboards.view.keepCamera, { canvasId: "tab-1", camera: { x: 10, y: 20, scale: 0.5 } }));
await sent(core.send(artboards.view.togglePanel, { canvasId: "tab-1" }));
const afterView = await sent(core.send(artboards.canvases.getCanvases, {}));
check("panning and the panel toggle leave the edit time as it was", afterView[0]?.editedAt, editedAt);

await sent(
	core.send(artboards.boards.writeBoard, {
		canvasId: "tab-1",
		html: "<p>a</p>",
		x: 0,
		y: 0,
		w: 400,
		h: 300,
	}),
);
const afterBoard = await sent(core.send(artboards.canvases.getCanvases, {}));
check("writing an artboard stamps the edit time", (afterBoard[0]?.editedAt ?? 0) > editedAt, true);
check("the row counts the artboard", afterBoard[0]?.boardCount, 1);

const names = Array.from({ length: 60 }, (_, at) => `Canvas ${String(at).padStart(2, "0")}`);

for (const [at, title] of names.entries()) {
	await sent(core.send(artboards.canvases.renameCanvas, { canvasId: `c-${at}`, title }));
}

const firstPage = await sent(
	core.send(artboards.canvases.getCanvasesPage, {
		offset: 0,
		limit: 48,
		order: "name",
		words: "",
	}),
);
check("a page counts every canvas", firstPage.total, 61);
check("a page holds its limit", firstPage.rows.length, 48);
check("name order sorts by title", firstPage.rows.slice(0, 2).map(({ title }) => title), ["Canvas 00", "Canvas 01"]);

const secondPage = await sent(
	core.send(artboards.canvases.getCanvasesPage, {
		offset: 48,
		limit: 48,
		order: "name",
		words: "",
	}),
);
check("the next page holds the rest", secondPage.rows.length, 13);
check("the last row by name", secondPage.rows.at(-1)?.title, "Sumi header");

await new Promise((settle) => setTimeout(settle, 5));
await sent(core.send(artboards.canvases.renameCanvas, { canvasId: "c-7", title: "Canvas 07 again" }));
const newest = await sent(
	core.send(artboards.canvases.getCanvasesPage, {
		offset: 0,
		limit: 1,
		order: "edited",
		words: "",
	}),
);
check("edited order puts the last edit first", newest.rows[0]?.title, "Canvas 07 again");

const found = await sent(
	core.send(artboards.canvases.getCanvasesPage, {
		offset: 0,
		limit: 48,
		order: "edited",
		words: "SUMI",
	}),
);
check("words find a canvas by title, any case", found.rows.map(({ canvasId }) => canvasId), ["tab-1"]);

const atEnd = (list: string) => ({
	chatId: list,
	groupId: null,
	before: null,
});
const chat = openTab(emptyMoment(BUILT_IN_APPS), { app: "chat", pageId: null }, atEnd(WORKSPACE_LIST));
const inChat = openTab(chat.moment, { app: "canvas", pageId: null }, atEnd(WORKSPACE_LIST));
const loose = openTab(inChat.moment, { app: "canvas", pageId: null }, atEnd(WORKSPACE_LIST));
const laid: HostTabsMoment = placeTab(loose.moment, inChat.tab.id, atEnd(chat.tab.id))?.moment ?? loose.moment;
const canvasTabs = appTabsInChatsOf(laid, BUILT_IN_APPS, "canvas").tabs;
check("only the canvas tabs are listed", canvasTabs.map(({ id }) => id), [inChat.tab.id, loose.tab.id]);
check("a canvas under a chat names that chat", canvasTabs[0]?.chat?.id, chat.tab.id);
check("a canvas outside a chat names none", canvasTabs[1]?.chat, null);

check("a free tab id becomes the new canvas id", freeCanvasIdOf("tab-9", new Set(["tab-1"])), "tab-9");
check(
	"a taken tab id gets the first free suffix",
	freeCanvasIdOf("tab-9", new Set(["tab-9", "tab-9-2"])),
	"tab-9-3",
);

const shape = gridShapeOf(1040, 220);
check("1040 px holds four columns", shape.columns, 4);
const view = {
	width: 1040,
	top: 2440,
	height: 732,
};
const shown = shownSpanOf(view, shape, 400);
check("only rows near the view are drawn: rows 8 to 14", [shown.first, shown.last], [32, 60]);
check("the next screen is wanted ahead of the scroll", wantedSpanOf(shown, view, shape).last, 72);
check(
	"a canvas never edited shows only its counts",
	cardMetaOf({ canvasId: "a", title: "a", pageCount: 1, boardCount: 2, editedAt: 0 }, 0),
	"1 page · 2 boards",
);

const served = dataFrameworkMiddleware(
	runtime()
		.modules(
			navigationModule({
				injects: {
					tabs: new MemoryTabsGateway(
						PlacedTabsSchema.parse({
							tabs: [
								{ id: "k0", app: "chat", pageId: null, label: "Sumi header chat" },
								{ id: "k1", app: "canvas", pageId: null, label: null, lastAddress: "tab-1" },
								{ id: "k2", app: "canvas", pageId: null, label: null },
							],
							lists: {
								workspace: [
									{ kind: "tab", id: "k0" },
									{ kind: "tab", id: "k2" },
								],
								k0: [{ kind: "tab", id: "k1" }],
							},
							views: { main: { shownId: "k2" } },
							minted: 3,
							closed: [],
						}),
					),
					placedApps: builtInPlacedApps(),
				},
			}),
			appsModule({ apps: [] }),
		)
		.start({
			platform: "server",
			env: {},
			scope: { workspaceId: "canvas-home-checks" },
		}),
	{ authenticate: new AppCallerAuthenticate() },
);
const appCalling = (app: string): Runtime =>
	runtime()
		.imports(
			apps({ over: orpcTransport("http://canvas.test", { fetch: served.fetch, headers: () => ({ [APP_CALLER_HEADER]: app }) }) }),
			navigation({ over: orpcTransport("http://canvas.test", { fetch: served.fetch, headers: () => ({ [APP_CALLER_HEADER]: app }) }) }),
		)
		.start();
const asCanvas = appCalling("canvas");
const asChat = appCalling("chat");

const canvasTabsAsCanvas = await asCanvas.send(navigation.tabFacts.tabsOfApp, { app: "canvas" });
check(
	"the canvas app reads its tabs and the chat holding each",
	canvasTabsAsCanvas.ok ? canvasTabsAsCanvas.output.tabs.map(({ id, chat }) => [id, chat?.title ?? null]) : canvasTabsAsCanvas.reason,
	[
		["k1", "Sumi header chat"],
		["k2", null],
	],
);
const canvasTabsAsChat = await asChat.send(navigation.tabFacts.tabsOfApp, { app: "canvas" });
check("another app is refused the canvas tabs", canvasTabsAsChat.ok, false);
const trailAsCanvas = await asCanvas.send(navigation.windowTrail.trail, { window: "w1" });
check("the canvas app reads the window trail for its header buttons", trailAsCanvas.ok, true);
const trailAsChat = await asChat.send(navigation.windowTrail.trail, { window: "w1" });
check("the chat app reads the window trail for its header buttons", trailAsChat.ok, true);

const titled = await asCanvas.send(apps.pages.record, { id: "k2", title: "Canvases" });
check("the canvas app names its own tab", titled.ok, true);

const addressOf = async (id: string): Promise<unknown> => {
	const read = await asCanvas.send(navigation.tabFacts.ownAppTab, { id });
	return read.ok ? read.output.address : read.reason;
};
await asCanvas.send(navigation.tabFacts.openLink, { from: "k2", href: "/tab-1", inNewTab: false });
check("a card's link puts the canvas in the home's tab", await addressOf("k2"), "tab-1");
await asCanvas.send(navigation.tabFacts.openLink, { from: "k2", href: "/", inNewTab: false });
check("the Canvases link takes the tab home", await addressOf("k2"), "");

core.stop();

if (failed > 0) {
	console.log(`${failed} canvas home checks failed`);
	process.exit(1);
}

console.log("canvas home checks passed");
