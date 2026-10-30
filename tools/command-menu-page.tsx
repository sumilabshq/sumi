import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app } from "../packages/shared/core/src/requests/index.ts";
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
import { placesOver } from "./places-fixture.ts";

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
				marks: { "chat-2": "running" },
			}),
		),
		CommandMenuModule,
	)
	.imports(placesOver())
	.start({ platform: "browser", scope: { workspaceId: "default" } });
void studio.send(DoRowCommand, { intent: { do: "open-app", app: "canvas", title: "Canvas" } });

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
			<Demo />
		</AppProvider>,
	);
}
