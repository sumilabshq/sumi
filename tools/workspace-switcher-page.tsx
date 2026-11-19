import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Icon } from "@widgetarium/kit";
import { PluginSlotsContext } from "@widgetarium/plugin-framework/react";
import { RuntimeProvider, localTransport, runtime } from "../packages/shared/data-framework/src/index.ts";
import { SlotFills } from "../packages/shared/plugin-framework/src/slot-fills.ts";
import type { Workspace } from "../packages/domain/workspaces/generated/contract.ts";
import {
	firstChats,
	memoryWorkspacesParts,
} from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { workspaces as workspacesModule } from "../packages/domain/workspaces/generated/module.ts";
import { chatFacts } from "../plugins/ai/chat/data/chat-facts/generated/contract.ts";
import { ControlMenuButton } from "../plugins/control-menu/src/features/control-menu/ui/control-menu/control-menu-button.tsx";
import { ControlMenuRow } from "../plugins/control-menu/src/features/control-menu/ui/control-menu-row/control-menu-row.tsx";
import { WorkspaceControlRow } from "../plugins/workspace-switcher/src/features/workspace-switcher/ui/workspace-control-row/workspace-control-row.tsx";
import { WorkspaceKeys } from "../plugins/workspace-switcher/src/features/workspace-switcher/ui/workspace-keys/workspace-keys.tsx";
import { workspaceStripAt } from "../plugins/workspace-switcher/src/features/workspace-switcher/ui/workspace-strip/workspace-strip.tsx";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const SEEDED: readonly Workspace[] = [
	{ id: "sumi", name: "Sumi", icon: { kind: "icon", name: "zap" }, ink: "yellow" },
	{ id: "client", name: "Client work", icon: { kind: "icon", name: "briefcase-business" }, ink: "yellow" },
	{ id: "personal", name: "Personal", icon: null, ink: "yellow" },
	{ id: "travel", name: "Travel", icon: { kind: "icon", name: "plane" }, ink: "yellow" },
];

const started = runtime()
	.modules(
		workspacesModule({
			injects: memoryWorkspacesParts({ workspaces: SEEDED, currentId: "sumi", chats: firstChats() }),
		}),
	)
	.imports(chatFacts({ over: localTransport() }))
	.start({
		platform: "browser",
		scope: {
			workspaceId: "sumi",
		},
	});

function DemoRows(): ReactElement {
	return <ControlMenuRow label="Tabs in sidebar" keys="✓" icon={<Icon name="panel-left" />} onRun={() => undefined} />;
}

const HeaderStrip = workspaceStripAt("header");
const SidebarStrip = workspaceStripAt("sidebar");

const FILLS = new SlotFills([
	{ slot: "control-menu.top", pluginId: "workspace-switcher", kind: "add", component: WorkspaceControlRow as never },
	{ slot: "control-menu.rows", pluginId: "tabs-view", kind: "add", component: DemoRows as never },
]);

function Demo(): ReactElement {
	return (
		<RuntimeProvider runtime={started}>
			<PluginSlotsContext.Provider value={FILLS}>
				<WorkspaceKeys />
				<div className="demo-window">
					<div className="demo-header" data-demo="header">
						<HeaderStrip />
						<span className="demo-tab is-on">Workspace switcher</span>
						<span className="demo-tab">Canvas</span>
						<span className="demo-fill" />
						<ControlMenuButton />
					</div>
					<div className="demo-body">
						<aside className="demo-sidebar" data-demo="sidebar">
							<div className="demo-rows">
								<span className="demo-row is-on">Workspace switcher</span>
								<span className="demo-row">Позиціонування для майкерів</span>
								<span className="demo-row">Чому 4 ГБ</span>
							</div>
							<SidebarStrip />
						</aside>
						<main className="demo-main" />
					</div>
				</div>
			</PluginSlotsContext.Provider>
		</RuntimeProvider>
	);
}

const host = document.getElementById("root");

if (host === null) {
	throw new Error("workspace switcher page: no #root");
}

createRoot(host).render(
	<div className="wg-root wg-studio-chat">
		<Demo />
	</div>,
);
