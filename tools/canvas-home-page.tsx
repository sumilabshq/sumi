import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { RuntimeProvider, runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { artboards as artboardsModule } from "../plugins/canvas/data/artboards/generated/module.ts";
import { artboards } from "../plugins/canvas/data/artboards/generated/contract.ts";
import { apps as appsModule } from "../plugins/apps/data/apps/generated/module.ts";
import { navigation as navigationModule } from "../plugins/tabs/navigation/data/navigation/generated/module.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { PlacedTabsSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { CanvasPage } from "../plugins/canvas/src/features/canvas/ui/canvas-page/canvas-page.tsx";
import { builtInPlacedApps } from "./placed-apps-fixture.ts";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

export const SEEDED_CANVASES = 300;

const CHATS = ["Питання про браузер Phi", "Дота HTML для MCP-чату", "Канвас: адаптив і домашня сторінка", "Sumi onboarding"];

const screenOf = (title: string): string =>
	`<!doctype html><html><body style="margin:0;font:16px system-ui;background:#fff;color:#1b1b1a"><div style="padding:48px"><h1 style="margin:0 0 24px;font-size:40px">${title}</h1><div style="height:56px;border:2px solid #ccc;margin-bottom:16px"></div><div style="width:240px;height:56px;background:#1b1b1a"></div></div></body></html>`;

async function seeded(): Promise<Runtime> {
	const app = runtime()
		.modules(
			artboardsModule({}),
			appsModule({ apps: [] }),
			navigationModule({
				injects: {
					tabs: new MemoryTabsGateway(
						PlacedTabsSchema.parse({
							tabs: [
								{ id: "k0", app: "chat", pageId: null, label: "Заголовок чату та сесії" },
								{ id: "k1", app: "canvas", pageId: null, label: null, lastAddress: "tab-1" },
								{ id: "home", app: "canvas", pageId: null, label: null, lastAddress: "" },
								{ id: "editor", app: "canvas", pageId: null, label: null, lastAddress: "tab-1" },
								...CHATS.flatMap((label, at) => [
									{ id: `chat-${at}`, app: "chat", pageId: null, label },
									{ id: `held-${at}`, app: "canvas", pageId: null, label: null, lastAddress: `c-${290 + at}` },
								]),
							],
							lists: {
								workspace: [
									{ kind: "tab", id: "k0" },
									{ kind: "tab", id: "home" },
									{ kind: "tab", id: "editor" },
									...CHATS.map((_, at) => ({ kind: "tab" as const, id: `chat-${at}` })),
								],
								k0: [{ kind: "tab", id: "k1" }],
								...Object.fromEntries(CHATS.map((_, at) => [`chat-${at}`, [{ kind: "tab" as const, id: `held-${at}` }]])),
							},
							views: { main: { shownId: "home" } },
							minted: 4,
							closed: [],
						}),
					),
					placedApps: builtInPlacedApps(),
				},
			}),
		)
		.start({ platform: "server", env: {}, scope: { workspaceId: "canvas-home-demo" } });

	for (let at = 0; at < SEEDED_CANVASES; at += 1) {
		await app.send(artboards.canvases.renameCanvas, {
			canvasId: `c-${at}`,
			title: `Canvas ${String(at).padStart(3, "0")}`,
		});
		await new Promise((settle) => setTimeout(settle, 1));
	}

	const board = { canvasId: "tab-1", board: null, page: null, w: 1280, h: 800, x: null, y: null };
	await app.send(artboards.boards.writeBoard, { ...board, name: "A · Chat header", html: screenOf("Chat header") });
	await app.send(artboards.boards.writeBoard, { ...board, name: "A2 · Sessions open", html: screenOf("Sessions") });
	await app.send(artboards.canvases.renameCanvas, { canvasId: "tab-1", title: "Sumi header" });
	return app;
}

void seeded().then((app) => {
	const root = document.getElementById("root");

	if (root === null) {
		return;
	}

	createRoot(root).render(
		<RuntimeProvider runtime={app}>
			<div className="canvas-home-demo">
				<CanvasPage app="canvas" tabId={location.hash.slice(1)} />
			</div>
		</RuntimeProvider>,
	);
});
