import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { FrameStart, TitleBar } from "../plugins/sumi-host/src/index.ts";
import { FlowsSidebar } from "../plugins/tabs/flows-sidebar/src/features/flows-column/ui/flows-sidebar/flows-sidebar.tsx";
import { SidebarTitle } from "../plugins/tabs/flows-sidebar/src/features/sidebar-title/ui/sidebar-title/sidebar-title.tsx";
import { FlowsWindowContext } from "../plugins/tabs/flows-sidebar/src/shared/lib/flows-window.ts";
import { RuntimeProvider, Slot } from "../packages/shared/data-framework/src/index.ts";
import { SlotFills } from "../packages/shared/plugin-framework/src/index.ts";
import { PluginSlotsContext } from "../packages/shared/plugin-framework/src/react/index.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { FIXTURE_WINDOW, sidebarWorldOf } from "./flows-sidebar-world.ts";
import type { SidebarScene } from "./flows-sidebar-world.ts";

const FILLS = new SlotFills([
	{ slot: "sumi-host.title-tabs", pluginId: "flows-sidebar", kind: "add" as const, component: SidebarTitle },
	{ slot: "sumi-host.frame-start", pluginId: "flows-sidebar", kind: "add" as const, component: FlowsSidebar },
]);

async function main(): Promise<void> {
	const scene = (location.hash.slice(1) || "inbox") as SidebarScene;
	const world = await sidebarWorldOf(scene);

	if (scene === "hidden" || scene === "peeking") {
		const answer = await world.app.send(navigation.windowSides.hideLeft, { window: FIXTURE_WINDOW, isHidden: true });

		if (!answer.ok) {
			throw new Error(answer.reason);
		}
	}

	if (scene === "peeking") {
		world.sidePeeks.setPeeking("left", true);
	}

	const holder = document.getElementById("frame");

	if (!holder) {
		throw new Error("flows sidebar page: no #frame");
	}

	createRoot(holder).render(
		<RuntimeProvider runtime={world.app}>
			<PluginSlotsContext.Provider value={FILLS}>
				<FlowsWindowContext.Provider value={FIXTURE_WINDOW}>
					<div className="wg-studio wg-root wg-shell is-flat" style={{ height: "100%" }}>
						<Slot loading={null}>
							<TitleBar />
						</Slot>
						<div className="wg-shell-body">
							<Slot loading={null}>
								<FrameStart />
							</Slot>
							<div className="wg-shell-app-zone">
								<div className="flows-page-plate" />
							</div>
						</div>
					</div>
				</FlowsWindowContext.Provider>
			</PluginSlotsContext.Provider>
		</RuntimeProvider>,
	);
}

void main();
