import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app } from "../packages/shared/data-framework/src/index.ts";
import { IsTooltipHosted, TooltipHost } from "../packages/shared/kit/src/index.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { CommandMenuModule } from "../packages/domain/command-menu/module.ts";
import { DoRowCommand } from "../packages/domain/command-menu/index.ts";
import { CommandMenu } from "../apps/studio/src/features/command-menu/ui/command-menu/command-menu.tsx";
import { CommandMenuKeys } from "../apps/studio/src/features/command-menu/ui/command-menu-keys/command-menu-keys.tsx";
import { SearchButton } from "../apps/studio/src/features/command-menu/ui/search-button/search-button.tsx";
import { useTogglesMenuOnShown } from "../apps/studio/src/features/command-menu/lib/use-toggles-menu-on-shown.ts";
import {
	SHOWN_TAB_SECTION,
	useTogglesNewTabMenu,
} from "../apps/studio/src/features/command-menu/lib/use-toggles-new-tab-menu.ts";
import type { BrowserTab } from "../packages/domain/browser/shared/schema/browser-tab.schema.ts";
import { FakeBrowserPagesGateway, fakeBrowser } from "./browser-fakes.ts";
import { reportsFailures } from "./page-harness.ts";
import { placedTabsOf, placesOver } from "./places-fixture.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { AskComposerContext } from "../apps/studio/src/features/command-menu/lib/ask-composer-context.ts";
import type { AskComposer } from "../apps/studio/src/features/command-menu/lib/ask-composer-context.ts";
import { AssistantModule } from "../packages/domain/assistant/module.ts";
import { tauriAssistantParts } from "../packages/domain/assistant/gateways/assistant-parts/tauri.gateway.ts";
import { claudeOptionsCell } from "../apps/host-tauri/src/assistant/claude-options-cell.ts";
import { workspaceFolderCell } from "../apps/host-tauri/src/assistant/workspace-folder-cell.ts";
import { NO_ASSISTANT } from "../packages/shared/core/src/engine/assistant-port.ts";
import { memoryFolder } from "./assistant-chat-app.ts";
import { MemoryChatDraftShelf } from "../apps/host-tauri/src/chat/tauri-chat-drafts.ts";

declare global {
	interface Window {
		__ASKED__?: { readonly text: string; readonly sends: boolean }[];
	}
}

reportsFailures();

class DemoPagesGateway extends FakeBrowserPagesGateway {
	private held: readonly BrowserTab[] = [];
	private shown: string | null = null;

	override tabs(): readonly BrowserTab[] {
		return this.held;
	}

	override shownId(): string | null {
		return this.shown;
	}

	override create(tabId: string): void {
		this.held = [
			...this.held,
			{
				...this.tab,
				id: tabId,
				url: "",
				title: "",
			},
		];
	}

	override show(tabId: string): void {
		this.shown = tabId;
	}

	override open(tabId: string, url: string): void {
		this.held = this.held.map((page) =>
			page.id === tabId
				? {
						...page,
						url,
						title: new URL(url).host,
					}
				: page,
		);
	}
}

const AT = Date.now();
const CHATS = ["Release plan", "translator", "Fix DeepL key lookup", "Jira sync for releases", "Weekly work log"];
const browser = fakeBrowser(new DemoPagesGateway());
browser.recentSites.saveRecentSites(
	["github.com", "figma.com", "mail.google.com", "calendar.google.com", "tailwindcss.com"].map((host) => ({
		host,
		address: `https://${host}/`,
		favicon: null,
	})),
);
const studio = app()
	.modules(
		AppHostModule,
		BrowserModule.with(browser.parts),
		LayoutModule,
		WorkspacesModule.with(
			memoryWorkspacesParts({
				workspaces: [
					{
						id: "default",
						name: "Default",
						icon: null,
					},
					{
						id: "untitled",
						name: "Untitled 1",
						icon: null,
					},
				],
				currentId: "default",
				chats: {
					chats: CHATS.map((title, at) => ({
						id: `chat-${at}`,
						title,
						isPinned: at === 1,
						createdAt: AT - at * 1000,
						lastAt: AT - at * 1000,
					})),
					openOnStartId: "chat-0",
				},
			}),
		),
		CommandMenuModule,
	)
	.imports(
		placesOver(
			new MemoryTabsGateway(
				placedTabsOf(
					{ tabs: [], shownId: null, minted: 0, closed: [] },
					CHATS.map((_title, at) => `chat-${at}`),
					["chat-1"],
					{ "chat-2": { mark: "running" } },
				),
			),
		),
	)
	.start({ platform: "browser", scope: { workspaceId: "default" } });
void studio.send(DoRowCommand, { intent: { do: "open-app", app: "canvas", title: "Canvas" } });

const ASK_WORKSPACE = {
	id: "default",
	name: "Default",
	folder: "/Users/me/Apps/translator",
	folderFound: true,
	recentFolders: ["/Users/me/Apps/translator", "/Users/me/Apps/recipes"],
};
const askApp = app()
	.modules(
		AssistantModule.with(
			tauriAssistantParts({
				kind: "tauri",
				chatDrafts: new MemoryChatDraftShelf(),
				tauriAssistant: {
					...NO_ASSISTANT,
					can: true,
					setup: async () => ({
						isReady: true,
						providerLabel: "Claude Code",
						providers: [
							{
								id: "claude-code",
								label: "Claude Code",
								canEdit: true,
								reads: {
									images: true,
									files: "path",
								},
							},
						],
						chosen: "claude-code",
						helperAgents: false,
						renderMarkdown: null,
					}),
				},
				tauriAttachments: {
					folder: "/attachments",
					files: memoryFolder(),
				},
				folders: {
					pick: async () => null,
					lend: () => undefined,
				},
				claudeOptions: claudeOptionsCell(),
				drops: {
					fileDragged: () => () => undefined,
				},
				workspace: {
					client: {
						chooseFolder: async (_id, folder) => ({ ...ASK_WORKSPACE, folder }),
						attachFolder: async () => null,
					},
					folder: workspaceFolderCell(ASK_WORKSPACE),
				},
			}),
		),
	)
	.start({ platform: "browser", scope: { workspaceId: "default" } });
window.__ASKED__ = [];
const askComposer: AskComposer = {
	app: askApp,
	ask: (text, sends) => window.__ASKED__?.push({ text, sends }),
};

function Demo(): ReturnType<typeof h> {
	const openNewTab = useTogglesNewTabMenu(SHOWN_TAB_SECTION);
	const openHere = useTogglesMenuOnShown("Canvas", null);
	return (
		<IsTooltipHosted.Provider value={true}>
			<div className="wg-cm-demo">
				<aside className="wg-cm-demo-side">
					<div className="wg-cm-demo-top">
						<SearchButton className="wg-cm-demo-search" iconPx={16} />
					</div>
					<button type="button" className="wg-cm-demo-new" data-demo-new-tab="" onClick={openNewTab}>
						New tab
					</button>
				</aside>
				<main className="wg-cm-demo-plate">
					<button type="button" className="wg-cm-demo-crumb" data-demo-crumb="" onClick={openHere}>
						Canvas
					</button>
				</main>
			</div>
			<CommandMenu />
			<CommandMenuKeys />
			<TooltipHost />
		</IsTooltipHosted.Provider>
	);
}

const root = document.getElementById("root");

if (root !== null) {
	createRoot(root).render(
		<AppProvider app={studio}>
			<AskComposerContext value={askComposer}>
				<Demo />
			</AskComposerContext>
		</AppProvider>,
	);
}
