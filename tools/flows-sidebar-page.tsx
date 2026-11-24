import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FrameStart, PaneBoardSlot, TitleBar } from "../plugins/sumi-host/src/index.ts";
import { FlowsSidebar } from "../plugins/tabs/flows-sidebar/src/features/flows-column/ui/flows-sidebar/flows-sidebar.tsx";
import { SidebarTitle } from "../plugins/tabs/flows-sidebar/src/features/sidebar-title/ui/sidebar-title/sidebar-title.tsx";
import { hasOwnDrag, isControl } from "../apps/tauri/src/window-drag-target.ts";
import { FlowBoard } from "../plugins/tabs/flow-board/src/features/flow-board/ui/flow-board/flow-board.tsx";
import { FlowStrip } from "../plugins/tabs/flow-strip/src/features/flow-header/ui/flow-strip/flow-strip.tsx";
import { FlowWindowContext } from "../plugins/tabs/flow-strip/src/shared/lib/flow-window-context.ts";
import { FlowsWindowContext } from "../plugins/tabs/flows-sidebar/src/shared/lib/flows-window.ts";
import { RuntimeProvider, Slot } from "../packages/shared/data-framework/src/index.ts";
import { SlotFills } from "../packages/shared/plugin-framework/src/index.ts";
import { PluginSlotsContext } from "../packages/shared/plugin-framework/src/react/index.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { FIXTURE_WINDOW, sidebarWorldOf } from "./flows-sidebar-world.ts";
import type { SidebarScene } from "./flows-sidebar-world.ts";

const SIDEBAR_FILLS = [
	{ slot: "sumi-host.title-tabs", pluginId: "flows-sidebar", kind: "add" as const, component: SidebarTitle },
	{ slot: "sumi-host.frame-start", pluginId: "flows-sidebar", kind: "add" as const, component: FlowsSidebar },
];
const BOARD_FILLS = [
	{ slot: "sumi-host.title-tabs", pluginId: "flow-strip", kind: "add" as const, component: FlowStrip },
	{ slot: "sumi-host.pane-board", pluginId: "flow-board", kind: "replace" as const, component: FlowBoard },
];
const BOARD_SCENE = "+board";
const NO_BOUNDS = { left: { leastPx: 0, usualPx: 0 }, chat: { leastPx: 0, usualPx: 0 }, plateLeastPx: 0 };

declare global {
	interface Window {
		__spoilUndo: () => Promise<void>;
		__chrome: {
			readonly hasOwnDrag: (target: Element) => boolean;
			readonly isControl: (target: Element) => boolean;
		};
	}
}

window.__chrome = { hasOwnDrag, isControl };

function PageZone({ isBoard }: { readonly isBoard: boolean }): ReactElement {
	if (!isBoard) {
		return <div className="flows-page-plate" />;
	}

	return (
		<PaneBoardSlot
			drawn={() => <div className="flows-page-plate" />}
			empty={<div className="flows-page-plate" />}
			chatPx={0}
			bounds={NO_BOUNDS}
			onChatPx={() => undefined}
		/>
	);
}

async function main(): Promise<void> {
	const asked = location.hash.slice(1) || "inbox";
	const isBoard = asked.endsWith(BOARD_SCENE);
	const scene = asked.replace(BOARD_SCENE, "") as SidebarScene;
	const fills = new SlotFills(isBoard ? [...SIDEBAR_FILLS, ...BOARD_FILLS] : SIDEBAR_FILLS);
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

	window.__spoilUndo = world.spoilUndo;

	const holder = document.getElementById("frame");

	if (!holder) {
		throw new Error("flows sidebar page: no #frame");
	}

	createRoot(holder).render(
		<RuntimeProvider runtime={world.app}>
			<PluginSlotsContext.Provider value={fills}>
				<FlowsWindowContext.Provider value={FIXTURE_WINDOW}>
					<FlowWindowContext.Provider value={FIXTURE_WINDOW}>
						<div className="wg-studio wg-root wg-shell is-flat" style={{ height: "100%" }}>
							<Slot loading={null}>
								<TitleBar />
							</Slot>
							<div className="wg-shell-body">
								<Slot loading={null}>
									<FrameStart />
								</Slot>
								<div className="wg-shell-app-zone">
									<PageZone isBoard={isBoard} />
								</div>
							</div>
						</div>
					</FlowWindowContext.Provider>
				</FlowsWindowContext.Provider>
			</PluginSlotsContext.Provider>
		</RuntimeProvider>,
	);
}

void main();
