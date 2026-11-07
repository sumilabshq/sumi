import { Profiler, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { RuntimeProvider } from "../packages/shared/data-framework/src/index.js";
import { ChatsColumn } from "../apps/studio/src/features/workspaces/ui/chats-column/chats-column.js";
import { ChatCrumb } from "../apps/studio/src/features/workspaces/ui/chat-crumb/chat-crumb.js";
import { ChatMore } from "../apps/studio/src/features/workspaces/ui/chat-more/chat-more.js";
import { ChatRenaming } from "../apps/studio/src/features/workspaces/lib/chat-renaming.js";
import { TooltipHost } from "../packages/shared/kit/src/index.js";
import { reportsFailures } from "./page-harness.ts";
import { BOARD_CHAT_FACTS, BOARD_CHAT_IDS, BOARD_PINNED, boardWorkspacesParts } from "./board-workspaces-fixture.ts";
import { studioAppOf } from "./studio-app-fixture.ts";
import { placedTabsOf } from "./places-fixture.ts";
import { MemoryTabsGateway } from "../plugins/apps/data/places/gateways/tabs/memory.gateway.ts";
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

const NO_TABS = { tabs: [], shownId: null, minted: 0, closed: [] };
const started = studioAppOf({
	workspaces: parts,
	places: new MemoryTabsGateway(placedTabsOf(NO_TABS, BOARD_CHAT_IDS, BOARD_PINNED, BOARD_CHAT_FACTS)),
});
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

const renaming = new ChatRenaming();

function ActivePlate(): ReturnType<typeof h> {
	return h(
		"main",
		{ style: PLATE_STYLE, "data-test-plate": "" },
		h(ChatCrumb, { renaming, chatId: null }),
		h(ChatMore, { renaming, chatId: null }),
	);
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
		RuntimeProvider,
		{ runtime: started },
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
