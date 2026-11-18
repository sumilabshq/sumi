import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { RuntimeProvider, runtime } from "../packages/shared/data-framework/src/index.ts";
import { artboards as artboardsModule } from "../plugins/canvas/data/artboards/generated/module.ts";
import { artboards } from "../plugins/canvas/data/artboards/generated/contract.ts";
import { AddedViews } from "../plugins/ai/mcp-apps/src/features/call-views/lib/added-views.ts";
import { callViewsOf } from "../plugins/ai/mcp-apps/src/features/call-views/ui/call-views/call-views.tsx";
import { ShownCanvasSchema } from "../plugins/canvas/data/canvas-work/generated/contract.ts";
import {
	MINI_CANVAS_HEIGHT,
	MiniCanvas,
} from "../plugins/canvas/src/features/mini-canvas/ui/mini-canvas/mini-canvas.tsx";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const CANVAS = "tab-1";
const screenOf = (title: string, accent: string): string =>
	`<!doctype html><html><body style="margin:0;font:16px system-ui;background:#f6f5f1;color:#1b1b1a"><div style="padding:48px"><h1 style="margin:0 0 24px;font-size:40px">${title}</h1><div style="height:56px;border:2px solid ${accent};background:#fff;margin-bottom:16px"></div><div style="height:56px;border:2px solid #ccc;background:#fff;margin-bottom:32px"></div><div style="width:240px;height:56px;background:#1b1b1a"></div></div></body></html>`;

async function seeded(): Promise<ReturnType<typeof runtime>["start"] extends (...args: never[]) => infer R ? R : never> {
	const app = runtime()
		.modules(artboardsModule({}))
		.start({ platform: "server", env: {}, scope: { workspaceId: "mcp-apps-demo" } });
	const board = { canvasId: CANVAS, board: null, page: null, w: 1280, h: 800, x: null, y: null };
	await app.send(artboards.boards.writeBoard, { ...board, name: "Report — loaded", html: screenOf("October report", "#ccc") });
	await app.send(artboards.boards.writeBoard, { ...board, name: "Report — bad date", html: screenOf("Bad date in row 14", "#e5484d") });
	await app.send(artboards.boards.writeBoard, { ...board, name: "Mobile", w: 390, html: screenOf("Report", "#ccc") });
	const created = await app.send(artboards.pages.createPage, { canvasId: CANVAS, name: "Ideas" });
	const page = created.ok ? created.output.page : null;
	await app.send(artboards.boards.writeBoard, { ...board, page, name: "Empty state", html: screenOf("Nothing yet", "#ccc") });
	await app.send(artboards.pages.renamePage, { canvasId: CANVAS, page: "page-1", name: "Report" });
	await app.send(artboards.pages.showPage, { canvasId: CANVAS, page: "page-1" });
	return app;
}

const views = new AddedViews();
views.add({ name: "canvas-mini", schema: ShownCanvasSchema, view: MiniCanvas, height: MINI_CANVAS_HEIGHT, guide: "a mini canvas" });
const CallViews = callViewsOf(views);
const shown = JSON.stringify({ canvasId: CANVAS, title: "MCP apps demo", page: "page-1", pageName: "Report", boardCount: 3 });
const call = {
	ref: "c1",
	name: "mcp__canvas__canvas-work_canvases_show-canvas",
	input: { canvasId: CANVAS },
	output: shown,
	answered: true,
	failed: false,
	at: 0,
};
const face = {
	kind: "read" as const,
	glyph: "",
	verb: "Showed the canvas",
	doing: "",
	object: "",
	isCodeObject: false,
	meta: null,
	change: null,
	view: "canvas-mini",
};

void seeded().then((app) => {
	const root = document.getElementById("root");

	if (root === null) {
		return;
	}

	createRoot(root).render(
		<RuntimeProvider runtime={app}>
			<div className="wg-chat-app mcp-apps-demo">
				<p>Screen for the report, two states and a mobile one:</p>
				<p className="mcp-apps-demo-row">› Showed the canvas</p>
				<CallViews calls={[call]} faces={[face]} />
				<p>Press inside to pan; the head switches pages.</p>
				<p className="mcp-apps-demo-row">look: border</p>
				<div data-demo-look="border">
					<MiniCanvas result={ShownCanvasSchema.parse(JSON.parse(shown))} look="border" />
				</div>
				<p className="mcp-apps-demo-row">look: none</p>
				<div data-demo-look="none">
					<MiniCanvas result={ShownCanvasSchema.parse(JSON.parse(shown))} look="none" />
				</div>
			</div>
		</RuntimeProvider>,
	);
});
