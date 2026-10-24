import assert from "node:assert/strict";
import { app } from "../packages/shared/core/src/requests/index.ts";
import type { Answer } from "../packages/shared/core/src/requests/index.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { AppTabsQuery } from "../packages/domain/app-host/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { ChatListQuery, WorkspacesQuery } from "../packages/domain/workspaces/index.ts";
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
	ToggleCommandMenuCommand,
	RenameRowCommand,
} from "../packages/domain/command-menu/index.ts";
import type { Intent, Results, ResultsAsk } from "../packages/domain/command-menu/index.ts";
import { RecordedPagesGateway, appHostFakesOf } from "./app-host-fixture.ts";
import { fakeBrowser } from "./browser-fakes.ts";
import { partsOf } from "./layout-rules-checks.ts";

const studio = app()
	.modules(BrowserModule, LayoutModule, WorkspacesModule, AppHostModule, CommandMenuModule)
	.start({ platform: "browser", scope: { workspaceId: "studio" } });

await check("opens anywhere and the door changes", async () => {
	ok(await studio.send(ToggleCommandMenuCommand, { door: "anywhere", text: "" }));
	const opened = ok(await studio.send(CommandMenuQuery));
	assert.equal(opened.isOpen, true);
	assert.equal(opened.door, "anywhere");
	ok(await studio.send(ChangeMenuDoorCommand, { door: "new-tab" }));
	assert.equal(ok(await studio.send(CommandMenuQuery)).door, "new-tab");
});

await check("the same opener twice closes the menu, another door switches it", async () => {
	ok(await studio.send(ToggleCommandMenuCommand, { door: "anywhere", text: "" }));
	assert.equal(ok(await studio.send(CommandMenuQuery)).isOpen, true);
	ok(await studio.send(ToggleCommandMenuCommand, { door: "anywhere", text: "" }));
	assert.equal(ok(await studio.send(CommandMenuQuery)).isOpen, false);
});

await check("a typo still finds the row", async () => {
	const found = await results({ text: "reopne closde", scope: "all", door: "anywhere" });
	assert.equal(found.sections[0]?.rows[0]?.title, "Reopen closed tab");
	const none = await results({ text: "zzqx", scope: "all", door: "anywhere" });
	assert.equal(none.sections[0]?.label, "Make new");
});

await check("empty text in All lists commands", async () => {
	const labels = (await results({ text: "", scope: "all", door: "anywhere" })).sections.map((section) => section.label);
	assert.ok(labels.includes("Commands"), `got ${labels.join(", ")}`);
});

await check("typing a command name puts it on top with its highlight", async () => {
	const found = await results({ text: "reopen", scope: "all", door: "anywhere" });
	const top = found.sections[0];
	assert.equal(top?.label, "Top hit");
	assert.equal(top?.rows[0]?.title, "Reopen closed tab");
	assert.deepEqual(top?.rows[0]?.match, { start: 0, length: 6 });
	assert.equal(found.sections.at(-1)?.label, "Make new");
	assert.deepEqual(found.askInk, { do: "ask-ink", text: "reopen" });
});

await check("an address opens first and Shift-Enter makes a new tab of it", async () => {
	const found = await results({ text: "github.com/ginetik", scope: "all", door: "anywhere" });
	assert.equal(found.sections[0]?.label, "Open");
	assert.equal(found.sections[0]?.rows[0]?.title, "Open github.com/ginetik");
	assert.deepEqual(found.makeNew, { do: "open-address", address: "github.com/ginetik", where: "new-tab" });
});

await check("the new tab door shows apps and sites as tiles", async () => {
	const found = await results({ text: "", scope: "all", door: "new-tab" });
	assert.equal(found.sections[0]?.layout, "grid");
	assert.equal(found.sections[0]?.rows[0]?.title, "Canvas");
});

await check("the chats scope makes a new chat from the text", async () => {
	const found = await results({ text: "Release notes", scope: "chats", door: "anywhere" });
	assert.equal(found.makeNewLabel, "New chat");
	const chatsBefore = await chatCount();
	const done = ok(await studio.send(DoRowCommand, { intent: intentOf(found.makeNew) }));
	assert.equal(done.isMenuKept, false);
	assert.equal(await chatCount(), chatsBefore + 1);
	const titles = ok(await studio.send(ChatListQuery)).recents.map((row) => row.title);
	assert.ok(titles.includes("Release notes"), `got ${titles.join(", ")}`);
	assert.equal(ok(await studio.send(CommandMenuQuery)).isOpen, false);
});

await check("a chat found by its name can be renamed from the menu", async () => {
	const found = await results({ text: "release", scope: "chats", door: "anywhere" });
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

await check("a new workspace is made with the typed name and found again", async () => {
	const found = await results({ text: "Personal", scope: "workspaces", door: "anywhere" });
	ok(await studio.send(DoRowCommand, { intent: intentOf(found.makeNew) }));
	assert.equal(ok(await studio.send(WorkspacesQuery)).current.name, "Personal");
	const back = await results({ text: "pers", scope: "all", door: "anywhere" });
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
	const shownId = ok(await withPages.send(AppTabsQuery)).tabs.find((tab) => tab.isShown)?.id ?? "";
	ok(await withPages.send(DoRowCommand, { intent: { do: "close-tab", id: shownId, title: "example" } }));
	const empty = ok(await withPages.send(CommandMenuResultsQuery, { text: "", scope: "all", door: "new-tab" }));
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
					marks: {},
					chatsElsewhere: {
						default: {
							chats: [
								{
									id: "tab-one-chat",
									title: "Default tab number one",
									isPinned: false,
									createdAt: 1,
									lastAt: 1,
								},
							],
							activeId: null,
						},
					},
				}),
			),
			AppHostModule,
			CommandMenuModule,
		)
		.start({ platform: "browser", scope: { workspaceId: "untitled" } });
	const found = ok(
		await elsewhere.send(CommandMenuResultsQuery, { text: "default tab", scope: "all", door: "anywhere" }),
	);
	const row = found.sections.flatMap((section) => section.rows).find((one) => one.intent.do === "open-chat-elsewhere");
	assert.equal(row?.title, "Default tab number one");
	assert.equal(row.meta, "In Default");
	ok(await elsewhere.send(DoRowCommand, { intent: row.intent }));
	assert.equal(ok(await elsewhere.send(WorkspacesQuery)).current.id, "default");
});

console.info("command menu: all checks passed");

async function results(ask: ResultsAsk): Promise<Results> {
	return ok(await studio.send(CommandMenuResultsQuery, ask));
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
