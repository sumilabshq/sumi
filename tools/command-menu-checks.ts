import assert from "node:assert/strict";
import { filledWithShown } from "../packages/domain/command-menu/features/opening/lib/shown-text.ts";
import { app } from "../packages/shared/core/src/requests/index.ts";
import type { Answer } from "../packages/shared/core/src/requests/index.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { AppTabsQuery, HeldTabsQuery, RenameTabCommand } from "../packages/domain/app-host/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { WorkspacesQuery } from "../packages/domain/workspaces/index.ts";
import { ChatListQuery } from "../packages/domain/app-host/index.ts";
import {
	firstChats,
	memoryWorkspacesParts,
} from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { CommandMenuModule } from "../packages/domain/command-menu/module.ts";
import {
	ChangeMenuDoorCommand,
	CommandMenuQuery,
	CommandMenuResultsQuery,
	DoRowCommand,
	CloseCommandMenuCommand,
	ToggleCommandMenuCommand,
	RenameRowCommand,
} from "../packages/domain/command-menu/index.ts";
import type { Intent, Results, ResultsAsk } from "../packages/domain/command-menu/index.ts";
import { RecordedPagesGateway, appHostFakesOf } from "./app-host-fixture.ts";
import { fakeBrowser } from "./browser-fakes.ts";
import { partsOf } from "./layout-rules-checks.ts";
import { placesOver } from "./places-fixture.ts";

const studio = app()
	.modules(BrowserModule, LayoutModule, WorkspacesModule, AppHostModule, CommandMenuModule)
	.imports(placesOver())
	.start({ platform: "browser", scope: { workspaceId: "studio" } });

await check("opens anywhere and the door changes", async () => {
	ok(await studio.send(ToggleCommandMenuCommand, { door: "anywhere", text: "" }));
	const opened = ok(await studio.send(CommandMenuQuery));
	assert.equal(opened.isOpen, true);
	assert.equal(opened.door, "anywhere");
	ok(await studio.send(ChangeMenuDoorCommand, { door: "new-tab" }));
	assert.equal(ok(await studio.send(CommandMenuQuery)).door, "new-tab");
	ok(await studio.send(ChangeMenuDoorCommand, { door: "ask" }));
	assert.equal(ok(await studio.send(CommandMenuQuery)).door, "ask");
});

await check("the same opener twice closes the menu, another door switches it", async () => {
	ok(await studio.send(ToggleCommandMenuCommand, { door: "anywhere", text: "" }));
	assert.equal(ok(await studio.send(CommandMenuQuery)).isOpen, true);
	ok(await studio.send(ToggleCommandMenuCommand, { door: "anywhere", text: "" }));
	assert.equal(ok(await studio.send(CommandMenuQuery)).isOpen, false);
});

await check("a typo still finds the row, and nothing found offers a New block", async () => {
	const found = await results({ text: "terminl", door: "anywhere" });
	assert.equal(found.sections[0]?.rows[0]?.title, "Terminal");
	const none = await results({ text: "zzqx", door: "anywhere" });
	assert.equal(none.foundCount, 0);
	assert.deepEqual(
		none.sections.map((section) => section.label),
		["New"],
	);
	assert.deepEqual(
		none.sections.flatMap((section) => section.rows).map((row) => row.title),
		["Search the web", "Ask Sumi"],
	);
});

await check("empty Suggested holds only what exists; the keys make a new chat or tab", async () => {
	const empty = await results({ text: "", door: "anywhere" });
	assert.equal(empty.foundCount, null);
	assert.equal(empty.sections.length, 1);
	assert.deepEqual(empty.askInk, { do: "run", command: "new-chat" });
	assert.deepEqual(empty.fallbackIntent, { do: "run", command: "new-tab" });
	assert.equal(empty.fallbackLabel, "New tab");
});

await check("what is found stands alone, with its highlight and no New block", async () => {
	const found = await results({ text: "term", door: "anywhere" });
	const top = found.sections[0];
	assert.ok((found.foundCount ?? 0) > 0, "Suggested counts what it found");
	assert.equal(found.sections.length, 1);
	assert.equal(top?.label, "");
	assert.equal(top?.rows[0]?.title, "Terminal");
	assert.deepEqual(top?.rows[0]?.match, { start: 0, length: 4 });
	assert.deepEqual(found.askInk, { do: "ask-ink", text: "term", sends: true });
});

await check("an address opens in a new tab on Shift-Enter", async () => {
	const found = await results({ text: "github.com/ginetik", door: "anywhere" });
	assert.equal(found.fallbackLabel, "Open in a new tab");
	assert.deepEqual(found.fallbackIntent, { do: "open-address", address: "github.com/ginetik", where: "new-tab" });
});

await check("the new tab door shows apps and sites as tiles", async () => {
	const found = await results({ text: "", door: "new-tab" });
	assert.equal(found.sections[0]?.layout, "grid");
	assert.equal(found.sections[0]?.rows[0]?.title, "Canvas");
});

await check("New offers Search the web, then Ask Sumi", async () => {
	const found = await results({ text: "why the build fails", door: "new-tab" });
	assert.equal(found.foundCount, null);
	assert.deepEqual(
		found.sections.flatMap((section) => section.rows).map((row) => row.kind),
		["search", "ask"],
	);
});

await check("the Ask door offers Create and send, then Create only", async () => {
	const empty = await results({ text: "", door: "ask" });
	assert.deepEqual(empty.sections, []);
	assert.deepEqual(empty.askInk, { do: "run", command: "new-chat" });
	const found = await results({ text: "release plan", door: "ask" });
	assert.deepEqual(
		found.sections.flatMap((section) => section.rows).map((row) => [row.kind, row.title]),
		[
			["ask", "Create and send"],
			["ask", "Create only"],
		],
	);
	assert.deepEqual(
		found.sections.flatMap((section) => section.rows).map((row) => [row.doLabel, row.shortcut, row.intent]),
		[
			["Create and send", "↵", { do: "ask-ink", text: "release plan", sends: true }],
			["Create only", "⇧↵", { do: "ask-ink", text: "release plan", sends: false }],
		],
	);
	assert.deepEqual(found.fallbackIntent, { do: "ask-ink", text: "release plan", sends: false });
	assert.equal(found.fallbackLabel, "Create only");
	assert.deepEqual(found.askInk, { do: "ask-ink", text: "release plan", sends: true });
	assert.equal(found.ghost, "");
	const marked = await results({ text: "? release plan", door: "anywhere" });
	assert.notEqual(marked.sections[0]?.rows[0]?.kind, "ask", "a typed ? no longer switches to asking");
});

await check("Ask Sumi makes a chat named by the text", async () => {
	const found = await results({ text: "Release notes", door: "anywhere" });
	const chatsBefore = await chatCount();
	const done = ok(await studio.send(DoRowCommand, { intent: intentOf(found.askInk) }));
	assert.equal(done.isMenuKept, false);
	assert.equal(await chatCount(), chatsBefore + 1);
	const titles = ok(await studio.send(ChatListQuery)).recents.map((row) => row.title);
	assert.ok(titles.includes("Release notes"), `got ${titles.join(", ")}`);
	assert.equal(ok(await studio.send(CommandMenuQuery)).isOpen, false);
});

await check("Create only makes the chat and says nothing was sent", async () => {
	const found = await results({ text: "Draft only", door: "ask" });
	const done = ok(await studio.send(DoRowCommand, { intent: intentOf(found.fallbackIntent) }));
	assert.equal(done.said, "New chat: drafted “Draft only”");
	assert.equal(ok(await studio.send(CommandMenuQuery)).isOpen, false);
});

await check("a chat found by its name can be renamed from the menu", async () => {
	const found = await results({ text: "release", door: "anywhere" });
	const row = found.sections[0]?.rows[0];
	assert.equal(row?.kind, "chat");
	assert.equal(row.title, "Release notes");
	assert.notEqual(row.renames, null);
	const renamed = ok(
		await studio.send(RenameRowCommand, { kind: "chat", id: row.renames?.id ?? "", name: "Ship notes" }),
	);
	assert.equal(renamed.isMenuKept, true);
	const titles = ok(await studio.send(ChatListQuery)).recents.map((one) => one.title);
	assert.ok(titles.includes("Ship notes"), `got ${titles.join(", ")}`);
});

await check("a workspace renamed from the menu is found by its name", async () => {
	const made = ok(await studio.send(WorkspacesQuery)).current;
	ok(await studio.send(RenameRowCommand, { kind: "workspace", id: made.id, name: "Personal" }));
	assert.equal(ok(await studio.send(WorkspacesQuery)).current.name, "Personal");
	const back = await results({ text: "pers", door: "anywhere" });
	assert.equal(back.sections[0]?.rows[0]?.kind, "workspace");
});

await check("Enter on an address opens it in a new browser tab, Open here replaces the shown page", async () => {
	const pages = new RecordedPagesGateway([]);
	const withPages = app()
		.modules(
			AppHostModule.with({ ...appHostFakesOf({}) }),
			BrowserModule.with(fakeBrowser(pages).parts),
			LayoutModule.with({ ...partsOf() }),
			WorkspacesModule,
			CommandMenuModule,
		)
		.imports(placesOver())
		.start({ platform: "browser", scope: { workspaceId: "studio" } });
	const tabsBefore = ok(await withPages.send(AppTabsQuery)).tabs.length;
	ok(await withPages.send(DoRowCommand, { intent: { do: "open-address", address: "example.com", where: "new-tab" } }));
	assert.equal(ok(await withPages.send(AppTabsQuery)).tabs.length, tabsBefore + 1);
	const newPage = pages.calls.find((call) => call.startsWith("open ")) ?? "";
	assert.ok(
		pages.opened.some((opened) => opened.includes("https://example.com")),
		`opened ${pages.opened.join(", ")}`,
	);
	ok(await withPages.send(DoRowCommand, { intent: { do: "open-address", address: "github.com", where: "this-tab" } }));
	assert.equal(ok(await withPages.send(AppTabsQuery)).tabs.length, tabsBefore + 1);
	assert.ok(
		pages.opened.some((opened) => opened.includes("https://github.com")),
		`opened ${pages.opened.join(", ")}`,
	);
	console.info(`    pages: ${pages.calls.join(", ")} (${newPage}); addresses: ${pages.opened.join(", ")}`);
	ok(
		await withPages.send(DoRowCommand, { intent: { do: "open-address", address: "second.example", where: "new-tab" } }),
	);
	const tabRows = ok(await withPages.send(AppTabsQuery)).tabs;
	const unshown = tabRows.find((tab) => !tab.isShown);
	assert.ok(unshown !== undefined, "a second tab stands beside the shown one");
	ok(await withPages.send(RenameTabCommand, { id: unshown.id, label: "Pressed tile" }));
	const unshownPage = ok(await withPages.send(HeldTabsQuery)).tabs.find((tab) => tab.id === unshown.id)?.pageId ?? null;
	assert.ok(unshownPage !== null, "the second tab holds a page");
	ok(
		await withPages.send(ToggleCommandMenuCommand, {
			door: "this-tab",
			text: null,
			pageId: unshownPage,
		}),
	);
	const overTile = ok(await withPages.send(CommandMenuQuery));
	assert.equal(overTile.pageId, unshownPage, "the menu opened from a tile's header acts on that tile's page");
	assert.equal(overTile.text, "Pressed tile", "the menu names the pressed tile's tab, not the shown one");
	const overResults = ok(
		await withPages.send(CommandMenuResultsQuery, {
			text: "x.example",
			door: "this-tab",
			pageId: unshownPage,
		}),
	);
	assert.ok(
		JSON.stringify(overResults.sections).includes("instead of Pressed tile"),
		"Open here names the pressed tile's tab",
	);
	const pressedRow = { ...unshown, address: "https://example.com/pressed" };
	const shownRow = { ...(tabRows.find((tab) => tab.isShown) ?? unshown), address: "https://example.com/shown" };
	assert.equal(
		filledWithShown([shownRow, pressedRow], "", pressedRow.id).text,
		"example.com/pressed",
		"the menu names the pressed tile's tab, not the shown one",
	);
	assert.equal(filledWithShown([shownRow, pressedRow], "", null).text, "example.com/shown");
	ok(await withPages.send(CloseCommandMenuCommand));
	const shownId = ok(await withPages.send(AppTabsQuery)).tabs.find((tab) => tab.isShown)?.id ?? "";
	ok(await withPages.send(DoRowCommand, { intent: { do: "close-tab", id: shownId, title: "example" } }));
	const empty = ok(await withPages.send(CommandMenuResultsQuery, { text: "", door: "new-tab" }));
	const closedRow = empty.sections.find((section) => section.label === "Recently closed")?.rows[0];
	assert.equal(closedRow?.kind, "closed-tab");
	ok(await withPages.send(DoRowCommand, { intent: closedRow.intent }));
	assert.ok(
		ok(await withPages.send(AppTabsQuery)).tabs.some((tab) => tab.id === shownId),
		"the closed tab came back",
	);
});

await check("the header door fills the text with what is shown", async () => {
	ok(await studio.send(DoRowCommand, { intent: { do: "open-app", app: "canvas", title: "Canvas" } }));
	ok(await studio.send(ToggleCommandMenuCommand, { door: "this-tab", text: null }));
	const menu = ok(await studio.send(CommandMenuQuery));
	assert.equal(menu.door, "anywhere");
	assert.equal(menu.text, "Canvas");
});

await check("a chat in another workspace is found and opened there", async () => {
	const elsewhere = app()
		.modules(
			BrowserModule,
			LayoutModule,
			WorkspacesModule.with(
				memoryWorkspacesParts({
					workspaces: [
						{
							id: "untitled",
							name: "Untitled",
							icon: null,
						},
						{
							id: "default",
							name: "Default",
							icon: null,
						},
					],
					currentId: "untitled",
					chats: firstChats(),
					chatsElsewhere: {
						default: {
							chats: [
								{
									id: "tab-one-chat",
									title: "Default tab number one",
									createdAt: 1,
									lastAt: 1,
								},
							],
							openOnStartId: null,
						},
					},
				}),
			),
			AppHostModule,
			CommandMenuModule,
		)
		.imports(placesOver())
		.start({ platform: "browser", scope: { workspaceId: "untitled" } });
	const found = ok(await elsewhere.send(CommandMenuResultsQuery, { text: "default tab", door: "anywhere" }));
	const row = found.sections.flatMap((section) => section.rows).find((one) => one.intent.do === "open-chat-elsewhere");
	assert.equal(row?.title, "Default tab number one");
	assert.equal(row.meta, "In Default");
	ok(await elsewhere.send(DoRowCommand, { intent: row.intent }));
	assert.equal(ok(await elsewhere.send(WorkspacesQuery)).current.id, "default");
});

console.info("command menu: all checks passed");

async function results(ask: Omit<ResultsAsk, "pageId">): Promise<Results> {
	return ok(await studio.send(CommandMenuResultsQuery, { ...ask, pageId: null }));
}

async function chatCount(): Promise<number> {
	const list = ok(await studio.send(ChatListQuery));
	return list.pinned.length + list.recents.length;
}

function ok<T>(answer: Answer<T>): T {
	if (!answer.ok) {
		throw new Error(`refused: ${answer.reason}`);
	}

	return answer.output;
}

function intentOf(intent: Intent | null): Intent {
	if (intent === null) {
		throw new Error("no make-new intent");
	}

	return intent;
}

async function check(name: string, run: () => Promise<void>): Promise<void> {
	await run();
	console.info(`ok  ${name}`);
}
