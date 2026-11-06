import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AssistantPanel } from "../apps/chat/src/features/assistant/ui/assistant-panel/assistant-panel.tsx";
import { AssistantModule } from "../packages/domain/assistant/module.ts";
import { tauriAssistantParts } from "../packages/domain/assistant/gateways/assistant-parts/tauri.gateway.ts";
import { claudeOptionsCell, DEFAULT_CLAUDE_OPTIONS } from "../apps/host-tauri/src/assistant/claude-options-cell.ts";
import { workspaceFolderCell } from "../apps/host-tauri/src/assistant/workspace-folder-cell.ts";
import { NO_ASSISTANT } from "../packages/shared/core/src/engine/assistant-port.ts";
import type {
	AssistantPort,
	AssistantProvider,
	AssistantSession,
	AssistantSetup,
} from "../packages/shared/core/src/engine/assistant-port.ts";
import { AppProvider, app } from "../packages/shared/core/src/requests/index.ts";
import { MascotModule } from "../packages/domain/mascot/module.ts";
import { memoryFolder } from "./assistant-chat-app.ts";
import { MemoryChatDraftShelf } from "../apps/host-tauri/src/chat/tauri-chat-drafts.ts";

declare global {
	interface Window {
		__SENT__?: string;
	}
}

const HOUR_MS = 3600000;
const USED_IN_FIVE_HOURS = 0.38;
const USED_THIS_WEEK = 0.12;
const PIXEL =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const SPEC_LINES = 214;
const SPEC_BYTES = 18 * 1024;

const CLAUDE_CODE: AssistantProvider = {
	id: "claude-code",
	label: "Claude Code",
	canEdit: true,
	reads: {
		images: true,
		files: "path",
	},
};

const SETUP: AssistantSetup = {
	isReady: true,
	providerLabel: "Claude Code",
	providers: [CLAUDE_CODE],
	chosen: "claude-code",
	helperAgents: false,
	renderMarkdown: null,
};

const CODEX_SETUP: AssistantSetup = {
	...SETUP,
	providerLabel: "Codex",
	providers: [
		CLAUDE_CODE,
		{
			id: "codex",
			label: "Codex",
			canEdit: true,
			reads: {
				images: false,
				files: "none",
			},
		},
	],
	chosen: "codex",
};

const EMPTY: AssistantSession = {
	turns: [],
	busy: false,
	failure: null,
	tool: null,
	phase: null,
	spent: 0,
	queued: [],
};

const TALKED: AssistantSession = {
	...EMPTY,
	turns: [
		{
			role: "user",
			text: "Add a weekly view to the habits page",
			calls: [],
		},
		{
			role: "agent",
			text: "Done. The habits page has a weekly grid now.",
			calls: [],
			startedAt: 0,
			endedAt: 1000,
			outcome: "done",
		},
	],
};

const WORKING: AssistantSession = {
	...TALKED,
	busy: true,
	phase: "thinking",
	turns: [
		...TALKED.turns,
		{
			role: "user",
			text: "Now add a monthly view",
			calls: [],
		},
		{
			role: "agent",
			text: "",
			calls: [],
			startedAt: Date.now(),
		},
	],
};

const SESSION_OF: Readonly<Record<string, AssistantSession>> = {
	empty: EMPTY,
	working: WORKING,
};

const SHOWN_WORKSPACE = {
	id: "personal",
	name: "Personal",
	folder: null,
	folderFound: false,
	recentFolders: ["/Users/me/Apps/habit-tracker", "/Users/me/Apps/recipes", "/Users/me/Apps/translator"],
};

function portOf(session: AssistantSession, setup: AssistantSetup): AssistantPort {
	return {
		...NO_ASSISTANT,
		can: true,
		session: () => session,
		setup: async () => setup,
		send: async (said) => {
			window.__SENT__ = said;
		},
	};
}

function linesOf(count: number, bytes: number): Uint8Array {
	const line = "x".repeat(Math.floor(bytes / count) - 1);
	return new TextEncoder().encode(Array.from({ length: count }, () => line).join("\n"));
}

const which = location.hash.slice(1) || "empty";
const port = portOf(SESSION_OF[which] ?? TALKED, which === "codex" ? CODEX_SETUP : SETUP);
const claudeOptions = claudeOptionsCell({
	...DEFAULT_CLAUDE_OPTIONS,
	usage: {
		fiveHour: {
			used: USED_IN_FIVE_HOURS,
			resetsAt: Date.now() + 2 * HOUR_MS,
		},
		week: {
			used: USED_THIS_WEEK,
			resetsAt: Date.now() + 100 * HOUR_MS,
		},
	},
});
const parts = tauriAssistantParts({
	kind: "tauri",
	chatDrafts: new MemoryChatDraftShelf(),
	tauriAssistant: port,
	tauriAttachments: {
		folder: "/attachments",
		files: memoryFolder(),
	},
	folders: {
		pick: async () => "/Users/me/Apps/habit-tracker",
		lend: () => undefined,
	},
	claudeOptions,
	drops: {
		fileDragged: () => () => undefined,
	},
	workspace: {
		client: {
			chooseFolder: async () => SHOWN_WORKSPACE,
			attachFolder: async () => null,
		},
		folder: workspaceFolderCell(SHOWN_WORKSPACE),
	},
});

if (which === "attach") {
	parts.draftAttachments.saveDraftAttachments([
		{
			id: "folder",
			name: "habit-tracker",
			kind: "folder",
			mime: "inode/directory",
			bytes: new Uint8Array(),
			preview: null,
			path: "/Users/me/Apps/habit-tracker",
		},
		{
			id: "image",
			name: "browser.png",
			kind: "image",
			mime: "image/png",
			bytes: new Uint8Array(8),
			preview: PIXEL,
			path: null,
		},
		{
			id: "text",
			name: "habits-spec.md",
			kind: "text",
			mime: "text/plain",
			bytes: linesOf(SPEC_LINES, SPEC_BYTES),
			preview: null,
			path: null,
		},
	]);
}

const chat = app()
	.modules(MascotModule, AssistantModule.with(parts))
	.start({
		platform: "browser",
		scope: {
			workspaceId: "chat-composer",
		},
	});
const holder = document.getElementById("chat");

if (!holder) {
	throw new Error("chat composer page: no #chat");
}

createRoot(holder).render(
	h(
		AppProvider,
		{ app: chat },
		h(AssistantPanel, { title: "Habit tracker", lead: h("span", { className: "chat-composer-lead" }) }),
	),
);
