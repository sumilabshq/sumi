import { runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { appHost as appHostModule } from "../plugins/tabs/navigation/data/app-host/generated/module.ts";
import { MemoryStudioWindowGateway } from "../plugins/tabs/navigation/data/app-host/gateways/studio-window/memory.gateway.ts";
import { NoCoreChangesGateway } from "../plugins/tabs/navigation/data/app-host/gateways/core-changes/none.gateway.ts";
import { MemorySidePeeksGateway } from "../plugins/tabs/navigation/data/app-host/gateways/side-peeks/memory.gateway.ts";
import { chatFacts } from "../plugins/ai/chat/data/chat-facts/generated/contract.ts";
import { apps as appsContract } from "../plugins/apps/data/apps/generated/contract.ts";
import { tabGroups } from "../plugins/tabs/tab-groups/data/tab-groups/generated/contract.ts";
import { navigation as placesContract } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { PlacedTabsSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import type { PlacedTabs, TabMark } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import type { FlowsDoc } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import { browser } from "../packages/domain/browser/generated/module.ts";
import { layout as layoutModule } from "../packages/state/layout/generated/module.ts";
import { serverLayoutParts } from "../packages/state/layout/gateways/layout-parts/server.gateway.ts";
import { workspaces } from "../packages/domain/workspaces/generated/module.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { fakeBrowser } from "./browser-fakes.ts";
import { PluginAppsModule } from "./plugin-apps-fixture.ts";
import { placesLinkOf } from "./places-fixture.ts";
import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";

export const FIXTURE_WINDOW = "main@fixture";

export type SidebarScene = "inbox" | "opened" | "finished" | "quiet" | "hidden" | "peeking";

interface ChatSpec {
	readonly title: string;
	readonly mark: TabMark;
}

interface FlowSpec {
	readonly name: string;
	readonly icon?: string;
	readonly chats: readonly ChatSpec[];
	readonly isNotes?: boolean;
}

interface FolderSpec {
	readonly name: string;
	readonly icon: string | null;
	readonly isOpen: boolean;
	readonly flows: readonly FlowSpec[];
}

interface WorldSpec {
	readonly loose: readonly FlowSpec[];
	readonly folders: readonly FolderSpec[];
	readonly current: string;
}

export interface SidebarWorld {
	readonly app: Runtime;
	readonly sidePeeks: MemorySidePeeksGateway;
	spoilUndo(): Promise<void>;
}

export async function sidebarWorldOf(scene: SidebarScene): Promise<SidebarWorld> {
	const spec = specOf(scene);
	const placed = PlacedTabsSchema.parse({
		tabs: tabsOf(spec),
		lists: { workspace: [] },
		minted: 1,
		closed: [],
		windows: [{ label: "main", openedAt: 1 }],
	});
	const places = new MemoryTabsGateway(placed, undefined, undefined, flowsDocOf(spec), {
		apps: BUILT_IN_APPS,
		now: () => 1_700_000_000_000,
	});
	const sidePeeks = new MemorySidePeeksGateway();
	const core = placesLinkOf(places, [PluginAppsModule]);
	const app = runtime()
		.modules(
			appHostModule({
				injects: {
					studioWindow: new MemoryStudioWindowGateway("fixture"),
					paneFlash: { flashPane: () => undefined },
					coreChanges: new NoCoreChangesGateway(),
					sidePeeks,
				},
			}),
			browser({ injects: fakeBrowser().parts }),
			layoutModule({ injects: { ...serverLayoutParts() } }),
			workspaces({
				injects: memoryWorkspacesParts({
					workspaces: [{ id: "home", name: "Home", icon: null, ink: "yellow" }],
					currentId: "home",
					chats: { chats: [], openOnStartId: null },
				}),
			}),
		)
		.imports(
			placesContract({ over: core }),
			tabGroups({ over: core }),
			chatFacts({ over: core }),
			appsContract({ over: core }),
		)
		.start({ platform: "browser", scope: { workspaceId: "fixture" } });
	return {
		app,
		sidePeeks,
		spoilUndo: () =>
			places.movePlaces((now) => ({
				next: now.flows === null ? null : { tabs: now.tabs, flows: { ...now.flows, inboxUndo: null } },
				reason: "harness: the undo offer was spent elsewhere",
				answer: undefined,
			})),
	};
}

const NOTE = (title: string): ChatSpec => ({ title, mark: "none" });

function specOf(scene: SidebarScene): WorldSpec {
	const isQuiet = scene === "quiet";
	const mark = (loud: TabMark): TabMark => {
		if (isQuiet) {
			return "none";
		}

		return scene === "finished" && loud === "asking" ? "unread" : loud;
	};
	return {
		loose: [{ name: "Reading list", icon: "globe", chats: [NOTE("Reading list")], isNotes: true }],
		current: scene === "opened" ? "Design system" : "Reading list",
		folders: [
			{
				name: "Sumi",
				icon: null,
				isOpen: true,
				flows: [
					{
						name: "Composer redesign",
						icon: "square-pen",
						chats: [
							{ title: "Refactor", mark: mark("failed") },
							{ title: "Run tests", mark: "running" },
							{ title: "Update docs", mark: mark("unread") },
						],
					},
					{ name: "Design system", icon: "layout-template", chats: [{ title: "Tokens", mark: mark("asking") }] },
					{ name: "Plugin layout", chats: [{ title: "Layout", mark: mark("unread") }] },
				],
			},
			{
				name: "Client project",
				icon: "globe",
				isOpen: true,
				flows: [{ name: "Sprint board", chats: [{ title: "Sprint", mark: mark("asking") }] }],
			},
			{
				name: "Personal",
				icon: "star",
				isOpen: false,
				flows: [{ name: "Trip plan", icon: "list", chats: [NOTE("Trip")], isNotes: true }],
			},
			{
				name: "Research",
				icon: "book-open",
				isOpen: false,
				flows: [{ name: "Summarize papers", chats: [{ title: "Papers", mark: "running" }] }],
			},
		],
	};
}

const idOf = (name: string): string => name.toLowerCase().replaceAll(" ", "-");

function tabsOf(spec: WorldSpec): PlacedTabs["tabs"] {
	const flows = [...spec.loose, ...spec.folders.flatMap((folder) => folder.flows)];
	return flows.flatMap((flow) =>
		flow.chats.map((chat, at) => ({
			id: `${idOf(flow.name)}-${at}`,
			app: flow.isNotes === true ? "markdown-viewer" : "chat",
			pageId: null,
			label: null,
			lastAddress: null,
			title: chat.title,
			mark: chat.mark,
		})),
	);
}

function flowOf(flow: FlowSpec): FlowsDoc["flows"][number] {
	const tabIds = flow.chats.map((_, at) => `${idOf(flow.name)}-${at}`);
	return {
		id: idOf(flow.name),
		name: flow.name,
		icon: flow.icon === undefined ? null : { kind: "icon", name: flow.icon },
		layout: {
			root: { kind: "pane", id: `pane-${idOf(flow.name)}`, tabIds, activeTabId: tabIds[0] ?? null },
			focusedPaneId: `pane-${idOf(flow.name)}`,
			minted: 1,
		},
		createdAt: 1,
		lastOpenedAt: 1,
	};
}

function flowsDocOf(spec: WorldSpec): FlowsDoc {
	return {
		v: 1,
		flows: [...spec.loose, ...spec.folders.flatMap((folder) => folder.flows)].map(flowOf),
		folders: spec.folders.map((folder) => ({
			id: idOf(folder.name),
			name: folder.name,
			icon: folder.icon === null ? null : { kind: "icon", name: folder.icon },
			baseDir: null,
			isOpen: folder.isOpen,
			flowIds: folder.flows.map((flow) => idOf(flow.name)),
		})),
		looseFlowIds: spec.loose.map((flow) => idOf(flow.name)),
		setups: [],
		windowFlows: { [FIXTURE_WINDOW]: idOf(spec.current) },
		inboxUndo: null,
		conversion: { key: "workspace-to-flows-v1", sourceRev: 1, sourceDigest: "demo", at: 0 },
	};
}
