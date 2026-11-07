import { createElement as h, Profiler } from "react";
import { createRoot } from "react-dom/client";
import type { Page, PageInput } from "../packages/shared/core/src/gateway/page.js";
import { PageInputSchema, PageOf } from "../packages/shared/core/src/gateway/page.js";
import { IQuery } from "../packages/shared/core/src/gateway/queries.js";
import { NO_STUDIO_HOST } from "../packages/shared/core/src/engine/studio-host.js";
import type { CursorPoint, StudioHostPort } from "../packages/shared/core/src/engine/studio-host.js";
import { NO_ASSISTANT } from "../packages/shared/core/src/engine/assistant-port.js";
import type {
	AssistantPort,
	AssistantSession,
	AssistantSetup,
} from "../packages/shared/core/src/engine/assistant-port.js";
import { corePack } from "../packages/shared/packs/core/src/index.js";
import type { WidgetariumProject } from "../packages/shared/core/src/app/widgetarium-project.js";
import { WidgetariumStudio, startStudio } from "../apps/studio/src/legacy/widgetarium-studio.js";
import { MemoryBrowserAuditGateway } from "../packages/domain/browser/gateways/browser-audit/memory.gateway.ts";
import { MemoryBrowserGrantsGateway } from "../packages/domain/browser/gateways/browser-grants/memory.gateway.ts";
import { MemoryRecentSitesGateway } from "../packages/domain/browser/gateways/recent-sites/memory.gateway.ts";
import { browserPartsOf } from "../packages/domain/browser/gateways/browser-parts/memory.gateway.ts";
import type { PageLook } from "../packages/domain/browser/shared/schema/page-look.schema.ts";
import * as taskList from "./studio-fixture-widget.tsx";
import { FixtureTaskSchema } from "./studio-fixture-widget.tsx";
import { restoreTabs } from "../apps/studio/src/tabs/studio-app.ts";
import { studioAppOf } from "./studio-app-fixture.ts";
import type { StudioAppParts } from "./studio-app-fixture.ts";
import { FakeBrowserPagesGateway, HurriedClockGateway } from "./browser-fakes.ts";
import { BOARD_CHAT_FACTS, BOARD_CHAT_IDS, BOARD_PINNED, boardWorkspacesParts } from "./board-workspaces-fixture.ts";
import { placedTabsOf } from "./places-fixture.ts";
import type { SeededTabs } from "./places-fixture.ts";
import { MemoryTabsGateway } from "../plugins/apps/data/places/gateways/tabs/memory.gateway.ts";
import { MemoryChatsGateway } from "../packages/domain/workspaces/gateways/chats/memory.gateway.ts";
import { boom, reportsFailures, stackOf } from "./page-harness.ts";

reportsFailures();

const STARTED_AT = performance.now();
const HAS_TRAFFIC_LIGHTS = new URLSearchParams(location.search).has("lights");
const IS_RECORDS_PENDING = new URLSearchParams(location.search).has("records-pending");
const CURSOR_FROM_TEST_HOST: StudioHostPort = {
	...NO_STUDIO_HOST,
	cursorInWindow: async () => cursorSetByTest(),
};
const TAURI_LIKE_HOST: StudioHostPort = {
	...CURSOR_FROM_TEST_HOST,
	insets: () => ({
		left: 76,
		right: 0,
		top: 37,
	}),
};

function cursorSetByTest(): CursorPoint | null {
	const held: unknown = Reflect.get(window, "__CURSOR__");
	return isCursorPoint(held) ? held : null;
}

function isCursorPoint(held: unknown): held is CursorPoint {
	return (
		typeof held === "object" &&
		held !== null &&
		typeof Reflect.get(held, "x") === "number" &&
		typeof Reflect.get(held, "y") === "number"
	);
}

type FixtureTask = { readonly id: string; readonly title: string };

class TasksQuery extends IQuery.input(PageInputSchema).output(PageOf(FixtureTaskSchema)) {
	override async query(_input: PageInput): Promise<Page<FixtureTask>> {
		return { items: [{ id: "t1", title: "Water the ferns" }], next: null, total: 1 };
	}
}

const PROJECT: WidgetariumProject = {
	app: { name: "Farm", iconHref: "" },
	routes: [
		{
			path: "/",
			params: [],
			board: {
				v: 2,
				tiles: [
					{
						id: "tasks",
						widget: "task-list",
						props: { getTasks: { implementation: "TasksQuery", fields: {}, allow: ["query"] } },
					},
				],
				layout: { dir: "column", of: [{ id: "tasks" }] },
			},
		},
	],
	widgets: { "task-list": taskList },
	handlers: { TasksQuery },
	packs: [corePack],
};

const FAKE_SETUP: AssistantSetup = {
	isReady: true,
	providerLabel: "Fake provider",
	providers: [{ id: "fake", label: "Fake provider", canEdit: true }],
	chosen: "fake",
	helperAgents: false,
	renderMarkdown: null,
};

const SESSION: AssistantSession = {
	...NO_ASSISTANT.session(),
	turns: [
		{ role: "user", text: "What is left before the Translator release?", calls: [] },
		{ role: "agent", text: "Three things: screenshots, the DeepL key and one check.", calls: [] },
	],
};

const ASSISTANT: AssistantPort = {
	...NO_ASSISTANT,
	can: true,
	session: () => SESSION,
	setup: async () => FAKE_SETUP,
};

class PaintedPagesGateway extends FakeBrowserPagesGateway {
	private container: HTMLElement | null = null;
	private readonly page = document.createElement("div");

	constructor() {
		super();
		this.page.dataset["paintedPage"] = "";
		this.page.style.cssText = "position:absolute;inset:0;";
	}

	override attach(into: HTMLElement): void {
		this.container = into;
		into.append(this.page);
		this.paint();
	}

	override detach(): void {
		this.page.remove();
		this.container = null;
	}

	override isOnScreen(): boolean {
		return this.container !== null;
	}

	override showLook(look: PageLook | null): void {
		super.showLook(look);
		this.paint();
	}

	private paint(): void {
		const look = this.look();
		this.page.style.background = look === null ? "" : look.fill;
	}
}

const IS_SEEDED = new URLSearchParams(location.search).has("seeded");

const SEEDED_TABS: SeededTabs = {
	tabs: [
		{ id: "tab-1", app: "browser", pageId: null, label: "Linear", essentialId: null },
		{ id: "tab-2", app: "canvas", pageId: null, label: "Release canvas", essentialId: null },
		{ id: "tab-3", app: "terminal", pageId: null, label: "Release terminal", essentialId: null },
	],
	lists: {
		workspace: [{ kind: "tab", id: "tab-1" }],
		release: [
			{ kind: "tab", id: "tab-2" },
			{ kind: "tab", id: "tab-3" },
		],
	},
	groups: [],
	shownId: "tab-1",
	lastShown: {},
	minted: 3,
	closed: [],
};

class PendingChatsGateway extends MemoryChatsGateway {
	override isLoaded(): boolean {
		return false;
	}
}

function seededParts(): Pick<StudioAppParts, "workspaces" | "places"> {
	if (!IS_SEEDED) {
		return {};
	}

	const board = boardWorkspacesParts("board");
	const workspaces = IS_RECORDS_PENDING
		? { ...board, chats: new PendingChatsGateway({ chats: [], openOnStartId: null }) }
		: board;
	const places = new MemoryTabsGateway(placedTabsOf(SEEDED_TABS, BOARD_CHAT_IDS, BOARD_PINNED, BOARD_CHAT_FACTS));
	Object.assign(window, { __PLACES__: places, __WORKSPACES__: workspaces });
	return {
		workspaces,
		places,
	};
}

const pages = new PaintedPagesGateway();
const studioApp = studioAppOf({
	browser: browserPartsOf(
		{
			browserPages: pages,
			browserGrants: new MemoryBrowserGrantsGateway(),
			browserAudit: new MemoryBrowserAuditGateway(),
			recentSites: new MemoryRecentSitesGateway(),
		},
		new HurriedClockGateway(),
	),
	workspaceId: "Default",
	...seededParts(),
});
void restoreTabs(studioApp);

const commits = { frame: 0 };

const root = document.getElementById("root");
if (root === null) throw new Error("the page holds no #root");

try {
	const assistant = new URLSearchParams(location.search).has("quiet") ? NO_ASSISTANT : ASSISTANT;
	const started = startStudio(PROJECT, {
		assistant,
		studioApp,
		studio: HAS_TRAFFIC_LIGHTS ? TAURI_LIKE_HOST : CURSOR_FROM_TEST_HOST,
		appId: "Default",
	});
	Object.assign(window, {
		__STUDIO__: started,
		__PAGES__: pages,
		__COMMITS__: commits,
		__STARTED_AT__: STARTED_AT,
	});
	createRoot(root).render(
		h(
			Profiler,
			{
				id: "studio",
				onRender: () => {
					commits.frame += 1;
				},
			},
			h(WidgetariumStudio, { started }),
		),
	);
} catch (failure: unknown) {
	boom(`render: ${stackOf(failure)}`);
}
