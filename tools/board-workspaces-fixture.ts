import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.js";
import type { WorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/workspaces-parts.gateway.js";
import type { KeptChat } from "../packages/domain/workspaces/shared/schema/chat.schema.js";
import type { Workspace } from "../packages/domain/workspaces/shared/schema/workspace.schema.js";
import type { SeededFacts } from "./places-fixture.ts";

export type WorkspacesCount = "one" | "board" | "many";

const BOARD_WORKSPACES: readonly Workspace[] = [
	{ id: "default", name: "Default", icon: { kind: "icon", name: "house" } },
	{ id: "widgetarium", name: "Widgetarium", icon: { kind: "emoji", emoji: "🧩" } },
	{ id: "urcraft", name: "Urcraft", icon: { kind: "icon", name: "briefcase-business" } },
	{ id: "personal", name: "Personal", icon: null },
	{ id: "travel", name: "Travel", icon: { kind: "icon", name: "plane" } },
	{ id: "reading", name: "Reading", icon: { kind: "emoji", emoji: "📚" } },
];

const MORE_WORKSPACES: readonly Workspace[] = [
	{ id: "finance", name: "Finance", icon: { kind: "emoji", emoji: "💸" } },
	{ id: "music", name: "Music", icon: { kind: "icon", name: "music-2" } },
	{ id: "garden", name: "Garden", icon: { kind: "icon", name: "leaf" } },
	{ id: "lab", name: "Lab", icon: { kind: "icon", name: "flask-conical" } },
	{ id: "side", name: "Side project", icon: { kind: "emoji", emoji: "🚀" } },
];

function chatOf(id: string, title: string, at: number): KeptChat {
	return {
		id,
		title,
		createdAt: at,
		lastAt: at,
	};
}

const BOARD_CHATS: readonly KeptChat[] = [
	chatOf("weekly", "Weekly work log", 90),
	chatOf("release", "Release plan", 80),
	chatOf("checks", "Translator 1.0 checks", 70),
	chatOf("brief", "Morning brief · 9:00", 60),
	chatOf("deepl", "Fix DeepL key lookup", 50),
	chatOf("notes", "Notifications experience", 40),
];

function workspacesOf(count: WorkspacesCount): readonly Workspace[] {
	if (count === "one") {
		return BOARD_WORKSPACES.slice(0, 1);
	}

	return count === "many" ? [...BOARD_WORKSPACES, ...MORE_WORKSPACES] : BOARD_WORKSPACES;
}

export const BOARD_PINNED: readonly string[] = ["weekly", "release"];

export const BOARD_CHAT_IDS: readonly string[] = BOARD_CHATS.map((chat) => chat.id);

const BOARD_MARKS: Readonly<Record<string, SeededFacts["mark"]>> = {
	checks: "unread",
	deepl: "running",
};

export const BOARD_CHAT_FACTS: Readonly<Record<string, SeededFacts>> = Object.fromEntries(
	BOARD_CHATS.map((chat) => [chat.id, { title: chat.title ?? "New chat", mark: BOARD_MARKS[chat.id] ?? "none" }]),
);

export function boardWorkspacesParts(count: WorkspacesCount): WorkspacesParts {
	return memoryWorkspacesParts({
		workspaces: workspacesOf(count),
		currentId: "default",
		chats: { chats: [...BOARD_CHATS], openOnStartId: "release" },
	});
}
