import { createElement as h, Profiler } from "react";
import { createRoot } from "react-dom/client";
import type { Page, PageInput } from "../packages/shared/core/src/gateway/page.js";
import { PageInputSchema, PageOf } from "../packages/shared/core/src/gateway/page.js";
import { IQuery } from "../packages/shared/core/src/gateway/queries.js";
import { NO_STUDIO_HOST } from "../packages/shared/core/src/engine/studio-host.js";
import type { StudioHostPort } from "../packages/shared/core/src/engine/studio-host.js";
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
import { NoChatComposerGateway } from "../packages/domain/browser/gateways/chat-composer/none.gateway.ts";
import { MemoryRecentSitesGateway } from "../packages/domain/browser/gateways/recent-sites/memory.gateway.ts";
import { browserPartsOf } from "../packages/domain/browser/gateways/browser-parts/browser-parts.gateway.ts";
import type { PageLook } from "../packages/domain/browser/shared/schema/page-look.schema.ts";
import * as taskList from "./studio-fixture-widget.tsx";
import { FixtureTaskSchema } from "./studio-fixture-widget.tsx";
import { FakeBrowserPagesGateway, HurriedClockGateway } from "./browser-fakes.ts";
import { boom, reportsFailures, stackOf } from "./page-harness.ts";

reportsFailures();

const STARTED_AT = performance.now();
const HAS_TRAFFIC_LIGHTS = new URLSearchParams(location.search).has("lights");
const TAURI_LIKE_HOST: StudioHostPort = {
	...NO_STUDIO_HOST,
	insets: () => ({
		left: 76,
		right: 0,
		top: 37,
	}),
};

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
		this.page.style.backgroundImage = look?.strip ? `url("${look.strip}")` : "";
		this.page.style.backgroundSize = "100% 44px";
		this.page.style.backgroundRepeat = "no-repeat";
	}
}

const pages = new PaintedPagesGateway();
const browser = browserPartsOf({
	browserPagesGateway: pages,
	browserGrantsGateway: new MemoryBrowserGrantsGateway(),
	browserAuditGateway: new MemoryBrowserAuditGateway(),
	clockGateway: new HurriedClockGateway(),
	recentSitesGateway: new MemoryRecentSitesGateway(),
	chatComposerGateway: new NoChatComposerGateway(),
});

const commits = { frame: 0 };

const root = document.getElementById("root");
if (root === null) throw new Error("the page holds no #root");

try {
	const assistant = new URLSearchParams(location.search).has("quiet") ? NO_ASSISTANT : ASSISTANT;
	const started = startStudio(PROJECT, {
		assistant,
		browser,
		studio: HAS_TRAFFIC_LIGHTS ? TAURI_LIKE_HOST : NO_STUDIO_HOST,
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
