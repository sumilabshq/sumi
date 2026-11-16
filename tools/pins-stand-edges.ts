import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { pins } from "../plugins/tabs/pinned-tabs/data/pins/generated/contract.ts";
import { workspaceRootOf } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { check } from "./check-helpers.ts";
import { atOf, breachesOf, clientOf, closeWindow, openPin, openWindow, standingsOf, worldOf } from "./pins-stand-world.ts";
import type { World } from "./pins-stand-world.ts";
import { chatFacts } from "../plugins/ai/chat/data/chat-facts/generated/contract.ts";

const OTHER_WORKSPACE = "other";


export async function bystanderChecks(world: World, ghost: string, alive: string): Promise<void> {
	await openPin(world, ghost, "pin-lost");
	const bystander = await clientOf(world, ghost).send(navigation.tabOpening.openTab, { at: atOf(ghost), app: "canvas" });
	const bystanderId = bystander.ok ? bystander.output.id : "none";
	check("a window that never joined holds its pin: the stand sees it owned by a gone window", breachesOf(world).length, 1);
	const taken = await openPin(world, alive, "pin-lost");
	check(
		"a live window takes a pin a lost window held: only the pin moves, the lost window's other tabs stay",
		[taken.heldBy, breachesOf(world), listOf(world, bystanderId)?.startsWith(`window:${ghost}@`)],
		[null, [], true],
	);
}

export async function workspaceChecks(world: World): Promise<void> {
	const [first, second] = world.labels;

	if (first === undefined || second === undefined) {
		return;
	}

	await clientOf(world, first).send(navigation.tabOpening.openOnce, { at: atOf(first, OTHER_WORKSPACE), id: "pin-ws", app: "canvas", address: "" });
	const own = await openPin(world, first, "pin-ws");
	const other = await openPin(world, second, "pin-ws");
	check(
		"a pin left in a window's list of another workspace opens here, and then sends others to this window",
		[own.heldBy, other.heldBy],
		[null, first],
	);
}

export async function inPlaceChecks(world: World): Promise<void> {
	const [first] = world.labels;

	if (first === undefined) {
		return;
	}

	await openPin(world, first, "pin-nav");
	const navigated = await clientOf(world, first).send(navigation.tabOpening.navigate, {
		at: atOf(first),
		target: { kind: "app", app: "tasks", address: "" },
		where: "this-tab",
		from: "pin-nav",
	});
	check(
		"navigating inside an open pinned tab keeps the pin's tab: same id, same window",
		[navigated.ok ? navigated.output.id : navigated.reason, listOf(world, "pin-nav")?.startsWith(`window:${first}@`)],
		["pin-nav", true],
	);
}

export async function chatInPlaceChecks(world: World): Promise<void> {
	const [first] = world.labels;

	if (first === undefined) {
		return;
	}

	await clientOf(world, first).send(chatFacts.turns.keepChatTabs, { window: atOf(first).window, chats: [{ id: "chat-x", title: "X" }] });
	const navigated = await clientOf(world, first).send(navigation.tabOpening.navigate, {
		at: atOf(first),
		target: { kind: "app", app: "canvas", address: "" },
		where: "this-tab",
		from: "chat-x",
	});
	const placed = await clientOf(world, first).send(navigation.tabs.placedTabs, { window: atOf(first).window });
	const chat = placed.ok ? placed.output.tabs.find(({ id }) => id === "chat-x") : undefined;
	check(
		"navigating in place from a chat tab opens a new tab there; the chat never becomes a page tab",
		[navigated.ok ? navigated.output.id !== "chat-x" : navigated.reason, chat?.app ?? "closed"],
		[true, "closed"],
	);
}

export async function chatPinChecks(world: World): Promise<void> {
	const [first, second, third] = world.labels;

	if (first === undefined || second === undefined || third === undefined) {
		return;
	}

	await clientOf(world, first).send(chatFacts.turns.keepChatTabs, { window: atOf(first).window, chats: [{ id: "pin-chat", title: "Budget plan" }] });
	const held = await openChat(world, second, "pin-chat");
	await clientOf(world, first).send(navigation.tabClosing.closeTab, { at: atOf(first), id: "pin-chat" });
	const reopened = await openChat(world, second, "pin-chat");
	check(
		"a pinned chat is one tab like any pin: open elsewhere sends here, closed there reopens here with its title",
		[held, reopened, await chatTitleIn(world, second, "pin-chat"), breachesOf(world)],
		[first, null, "chat Budget plan", []],
	);
	await clientOf(world, third).send(chatFacts.turns.keepChatTabs, { window: atOf(third).window, chats: [{ id: "pin-chat-2", title: "Roadmap" }] });
	await closeWindow(world, third);
	const taken = await openChat(world, second, "pin-chat-2");
	await openWindow(world, third);
	check(
		"a pinned chat left in a closed window's session opens here with its title, and the session lets it go",
		[taken, await chatTitleIn(world, second, "pin-chat-2"), breachesOf(world)],
		[null, "chat Roadmap", []],
	);
	check("a chat pin with no chat anywhere is refused, no ghost tab is made", await openChat(world, first, "no-such-chat"), "refused");
}

export async function chatDuplicateChecks(world: World): Promise<void> {
	const [first] = world.labels;

	if (first === undefined) {
		return;
	}

	const client = clientOf(world, first);
	await client.send(chatFacts.turns.keepChatTabs, { window: atOf(first).window, chats: [{ id: "dup-chat", title: "Plan" }] });
	const copied = await client.send(navigation.tabOpening.duplicate, { at: atOf(first), id: "dup-chat", list: null, groupId: null, show: true });
	const copyId = copied.ok ? copied.output.id : "refused";
	await client.send(chatFacts.turns.recordTurn, { id: "dup-chat", title: null, isBusy: true, isSeen: false });
	const own = await client.send(navigation.tabFacts.ownAppTab, { id: copyId });
	const placed = await client.send(navigation.tabs.placedTabs, { window: atOf(first).window });
	const marks = placed.ok ? placed.output.tabs.filter(({ id }) => id === "dup-chat" || id === copyId).map(({ mark }) => mark) : [];
	const open = await client.send(chatFacts.openChats.all);
	check(
		"duplicating a chat tab makes a second tab linking the same chat: its title, its turn marks, one chat in the list",
		[
			copyId !== "dup-chat" && copyId !== "refused",
			own.ok ? [own.output.app, own.output.chatId, own.output.title] : own.reason,
			marks,
			open.ok ? open.output.open.filter(({ id }) => id === "dup-chat").length : open.reason,
		],
		[true, ["chat", "dup-chat", "Plan"], ["running", "running"], 1],
	);	await client.send(navigation.tabClosing.closeTab, { at: atOf(first), id: "dup-chat" });
	const shown = await client.send(navigation.tabShowing.show, { at: atOf(first), id: "dup-chat", paneId: null });
	const byChat = await client.send(navigation.tabFacts.ownAppTab, { id: "dup-chat" });
	check(
		"with the first chat tab closed, the chat still opens by its id through the tab left",
		[shown.ok || shown.reason, byChat.ok ? byChat.output.id : byChat.reason],
		[true, copyId],
	);
}

async function openChat(world: World, label: string, id: string): Promise<string | null> {
	const answer = await clientOf(world, label).send(navigation.tabOpening.openOnce, { at: atOf(label), id, app: "chat", address: "" });
	return answer.ok ? answer.output.heldBy : "refused";
}

async function chatTitleIn(world: World, label: string, id: string): Promise<string> {
	const placed = await clientOf(world, label).send(navigation.tabs.placedTabs, { window: atOf(label).window });
	const chat = placed.ok ? placed.output.tabs.find((tab) => tab.id === id) : undefined;
	return chat === undefined ? "missing" : `${chat.app} ${chat.title ?? "untitled"}`;
}

export async function storeChecks(): Promise<void> {
	const key = `${String(workspaceRootOf("stand"))}:pins.json`;
	const kept = { id: "a", app: "canvas", address: "", title: "A", icon: "canvas", favicon: null };
	const world = worldOf(2, (fake) => fake.put(key, { v: 1, rev: 1, pins: [kept, { broken: true }] }));
	await openWindow(world, "w1");
	await clientOf(world, "w1").send(pins.pins.pin, { ...kept, id: "c", title: "C" });
	const file = world.fake.files.get(key) as { pins?: readonly { id?: string; broken?: boolean }[] } | undefined;
	check(
		"the first pin of a fresh core waits for pins.json: earlier pins stay, an unreadable entry is kept in the file",
		(file?.pins ?? []).map((one) => one.id ?? (one.broken === true ? "broken" : "?")),
		["broken", "a", "c"],
	);
}

function listOf(world: World, id: string): string | null {
	return standingsOf(world).find((standing) => standing.id === id)?.list ?? null;
}
