import { Profiler, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app } from "../packages/core/src/requests/index.js";
import { ChatsColumn } from "../packages/workspaces/shared/ui/chats-column/chats-column.js";
import { ChatCrumb } from "../packages/workspaces/shared/ui/chat-crumb/chat-crumb.js";
import { WorkspacesClientModule } from "../packages/workspaces/generated/module.js";
import { TooltipHost } from "../packages/kit/src/index.js";
import { reportsFailures } from "./page-harness.ts";
import { boardWorkspacesParts } from "./board-workspaces-fixture.ts";
import type { WorkspacesCount } from "./board-workspaces-fixture.ts";

reportsFailures();

const asked = new URLSearchParams(location.search);

const parts = boardWorkspacesParts(workspacesCountOf());

function workspacesCountOf(): WorkspacesCount {
	if (asked.has("one")) {
		return "one";
	}

	return asked.has("many") ? "many" : "board";
}

if (asked.get("theme") === "dark") {
	document.documentElement.classList.add("dark");
}

const commits: { count: number; ms: number } = { count: 0, ms: 0 };
Reflect.set(window, "__chats", { parts, commits });

const started = app({ modules: [WorkspacesClientModule.with(parts)] });
const FRAME_STYLE = {
	position: "relative",
	width: "1440px",
	height: "900px",
	overflow: "hidden",
	background: "var(--sumi-frame)",
	display: "flex",
	gap: "8px",
	padding: "8px",
	boxSizing: "border-box",
} as const;
const LEFT_STYLE = { width: "268px", flex: "none", display: "flex", minHeight: 0 } as const;
const PLATE_STYLE = {
	flex: 1,
	minWidth: 0,
	background: "var(--sumi-plate)",
	borderRadius: "14px",
	boxShadow: "var(--sumi-shadow-plate)",
	padding: "8px",
} as const;

function ActivePlate(): ReturnType<typeof h> {
	return h("main", { style: PLATE_STYLE, "data-test-plate": "" }, h(ChatCrumb));
}

const studioLayer = document.createElement("div");
studioLayer.className = "wg-root wg-portal wg-kit-portal-layer is-studio";
document.body.appendChild(studioLayer);

const root = document.getElementById("root");
if (root === null) {
	throw new Error("the page has no #root");
}

createRoot(root).render(
	h(
		AppProvider,
		{ app: started },
		h(
			Profiler,
			{
				id: "column",
				onRender: (_id: string, _phase: string, actualMs: number) => {
					commits.count += 1;
					commits.ms += actualMs;
				},
			},
			h(
				"div",
				{ className: "sm", style: FRAME_STYLE },
				h("div", { style: LEFT_STYLE, "data-test-left": "" }, h(ChatsColumn)),
				h(ActivePlate),
			),
		),
		h(TooltipHost),
	),
);
