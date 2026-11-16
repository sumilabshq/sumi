import type { InputOf, Runtime } from "../packages/shared/data-framework/src/index.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { check, tally } from "./check-helpers.ts";
import { AT, SPLIT_ON_BOARD, openShapesOf, rowOfTwo, sent, splitOf, started } from "./places-splits-fixture.ts";
import { chatFacts } from "../plugins/ai/chat/data/chat-facts/generated/contract.ts";

type NavigateAsk = Omit<InputOf<typeof navigation.tabOpening.navigate>, "at">;

console.info = () => undefined;

async function navigatedIdOf(window: Runtime, ask: NavigateAsk): Promise<string> {
	const settled = await sent(window.send(navigation.tabOpening.navigate, { at: AT, ...ask }));
	return typeof settled === "string" ? settled : settled.id;
}

async function newTabOverSplitChecks(window: Runtime): Promise<void> {
	await window.send(navigation.splits.placeInView, { at: AT, tabId: "tab-2", targetTabId: "tab-1", side: "right" });
	const opened = await sent(window.send(navigation.tabOpening.openTab, { at: SPLIT_ON_BOARD, app: "canvas" }));
	check(
		"a new tab opened over a shown split leaves the split and shows the new tab alone, never inside a half",
		[
			typeof opened === "string" ? opened : opened.effects.map(({ kind }) => kind).filter((kind) => kind !== "open-page"),
			await splitOf(window),
		],
		[
			["leave-split", "open-shown-tab-pane"],
			{ shownId: "tab-7", split: null },
		],
	);
}

async function inPlaceChecks(window: Runtime): Promise<void> {
	const inPlace = await navigatedIdOf(window, {
		target: { kind: "app", app: "canvas", address: "" },
		where: "this-tab",
		from: "tab-3",
	});
	check(
		"this-tab keeps the tab, its id and its place; only what it shows changes",
		[inPlace, await openShapesOf(window)],
		["tab-3", [["tab-1", "tab-2"], "tab-3", "tab-4", "tab-5", "tab-7"]],
	);
	await window.send(navigation.tabShowing.show, { at: AT, id: "tab-1" });
	await navigatedIdOf(window, {
		target: { kind: "app", app: "canvas", address: "" },
		where: "this-tab",
		from: "tab-2",
	});
	check("this-tab from a split half keeps the half: same members, focused on it", await splitOf(window), {
		members: ["tab-1", "tab-2"],
		focused: "tab-2",
		layout: rowOfTwo("split-1-b1", "tab-1", "tab-2"),
	});
}

async function chatChecks(window: Runtime): Promise<void> {
	await window.send(chatFacts.turns.keepChatTabs, { chats: [{ id: "chat-new", title: null }] });
	check("a new chat is kept at the end of the list", ((await openShapesOf(window)) as unknown[]).at(-1), "chat-new");
	await navigatedIdOf(window, {
		target: { kind: "tab", id: "chat-new", isMoved: true },
		where: "this-tab",
		from: "tab-4",
	});
	check("a moved chat takes the place of the tab it replaces", await openShapesOf(window), [
		["tab-1", "tab-2"],
		"tab-3",
		"chat-new",
		"tab-5",
		"tab-7",
	]);
	await navigatedIdOf(window, {
		target: { kind: "tab", id: "tab-3", isMoved: false },
		where: "this-tab",
		from: "tab-5",
	});
	check(
		"a tab that is not moved stays where it stands while the tab it replaces closes",
		await openShapesOf(window),
		[["tab-1", "tab-2"], "tab-3", "chat-new", "tab-7"],
	);
}

async function refusalChecks(window: Runtime): Promise<void> {
	const fromless = await sent(
		window.send(navigation.tabOpening.navigate, { at: AT, target: { kind: "app", app: "canvas" }, where: "this-tab" }),
	);
	check(
		"this-tab without the tab it replaces is refused",
		typeof fromless === "string" ? fromless : "navigated",
		"this-tab needs from: the tab whose place the target takes",
	);
}

const { window } = started();
await newTabOverSplitChecks(window);
await inPlaceChecks(window);
await chatChecks(window);
await refusalChecks(window);

if (tally.failed > 0) {
	console.log(`places navigating: ${tally.failed} failed`);
	process.exit(1);
}

console.log("places navigating: all checks passed");
