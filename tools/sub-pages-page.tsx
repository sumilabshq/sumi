import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { DropRefusal, Sidebar, SidebarContent, SidebarMenu, SidebarMenuFold } from "@widgetarium/kit";
import { PluginSlotsContext } from "@widgetarium/plugin-framework/react";
import { SlotFills } from "../packages/shared/plugin-framework/src/slot-fills.ts";
import type { AppTabState, SidebarTab } from "../plugins/tabs/navigation/data/app-host/shared/schema/app-tab.schema.ts";
import type { TabActs } from "../plugins/tabs/tab-strip/src/features/tab-strip/lib/use-tab-acts.ts";
import { TabEntry } from "../plugins/tabs/tabs-sidebar/src/features/tabs-sidebar/ui/tab-entry/tab-entry.tsx";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const host = document.getElementById("root");

if (host === null) {
	throw new Error("chat artifacts page: no #root");
}

function tabOf(id: string, title: string, icon: AppTabState["icon"], isShown = false): AppTabState {
	return {
		id,
		app: icon === "chat" ? "chat" : "browser",
		title,
		subtitle: null,
		icon,
		favicon: null,
		status: null,
		label: null,
		address: null,
		isInOwnWindow: false,
		mark: "none",
		isShown,
	};
}

const ENTRIES: readonly SidebarTab[] = [
	{ kind: "tab", tab: tabOf("burger", "Дубль бургер-меню і дивайдер", "chat"), artifacts: [], isFolded: false },
	{
		kind: "tab",
		tab: tabOf("groups-chat", "Групи, спліти та артефакти", "chat"),
		artifacts: [
			{ kind: "tab", tab: tabOf("canvas", "Canvas", "canvas", true) },
			{ kind: "tab", tab: tabOf("plan", "plan.md", "note") },
			{ kind: "tab", tab: tabOf("jira", "jira.com · T-12", "site") },
		],
		isFolded: false,
	},
	{
		kind: "tab",
		tab: tabOf("icons-chat", "Дизайн статусів іконки чату", "chat"),
		artifacts: [{ kind: "tab", tab: tabOf("icons", "status-icons.tsx", "code-ts") }],
		isFolded: true,
	},
	{ kind: "tab", tab: tabOf("plugins", "Плагіни: UI і регістри", "chat"), artifacts: [], isFolded: false },
	{ kind: "tab", tab: tabOf("page", "example.com", "site") },
];

const ACTS = {
	show: () => undefined,
	close: () => undefined,
} as unknown as TabActs;

function DemoFold({ tabId }: { readonly tabId: string }): ReactElement | null {
	const entry = ENTRIES.find((one) => one.tab.id === tabId);
	const [isOpen, setOpen] = useState(!(entry?.isFolded ?? false));
	return entry?.artifacts === undefined || entry.artifacts.length === 0 ? null : (
		<SidebarMenuFold isOpen={isOpen} label="Fold" onClick={() => setOpen(!isOpen)} />
	);
}

const FILLS = new SlotFills([
	{ slot: "tabs-sidebar.tab-actions", pluginId: "artifacts", kind: "add", component: DemoFold as never },
]);

function Demo(): ReactElement {
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	return (
		<PluginSlotsContext.Provider value={FILLS}>
			<div className="demo">
				<Sidebar
					as="aside"
					side="left"
					variant="sidebar"
					collapsible="none"
					className="sumi-tabs-sidebar"
					style={{ width: 300 }}
				>
					<SidebarContent>
						<SidebarMenu role="tablist">
							{ENTRIES.map((entry) => (
								<TabEntry
									key={entry.tab.id}
									item={{ kind: "tab", tab: entry.tab, list: "workspace", groupId: null, group: null }}
									acts={ACTS}
									isSub={false}
									isPlaceholder={false}
									artifacts={entry.artifacts}
									isFolded={entry.isFolded}
									onMenu={() => undefined}
								/>
							))}
						</SidebarMenu>
					</SidebarContent>
				</Sidebar>
				<div
					className="refusal-host"
					ref={(element) => {
						const row = element?.parentElement?.querySelector<HTMLElement>('[data-sort-id="plugins"]') ?? null;
						if (row !== anchor) setAnchor(row);
					}}
				/>
				<DropRefusal anchor={anchor} words="A chat can't hold a chat" />
			</div>
		</PluginSlotsContext.Provider>
	);
}

createRoot(host).render(
	<div className="wg-root dark">
		<Demo />
	</div>,
);
