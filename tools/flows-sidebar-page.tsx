import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { TooltipHost } from "@widgetarium/kit";
import { FrameStart, PaneBoardSlot, TabFaceContext, TitleBar } from "../plugins/sumi-host/src/index.ts";
import { MenuTabFace } from "../apps/studio/src/features/app-host/ui/tab-face/menu-tab-face.tsx";
import { FlowsSidebar } from "../plugins/tabs/flows-sidebar/src/features/flows-column/ui/flows-sidebar/flows-sidebar.tsx";
import { SidebarTitle } from "../plugins/tabs/flows-sidebar/src/features/sidebar-title/ui/sidebar-title/sidebar-title.tsx";
import { hasOwnDrag, isControl } from "../apps/tauri/src/window-drag-target.ts";
import { FlowBoard } from "../plugins/tabs/flow-board/src/features/flow-board/ui/flow-board/flow-board.tsx";
import { FlowStrip } from "../plugins/tabs/flow-strip/src/features/flow-header/ui/flow-strip/flow-strip.tsx";
import { FlowWindowContext } from "../plugins/tabs/flow-strip/src/shared/lib/flow-window-context.ts";
import { TrailButtons } from "../plugins/tabs/flows-sidebar/src/shared/ui/trail-buttons/trail-buttons.tsx";
import { FlowsWindowContext } from "../plugins/tabs/flows-sidebar/src/shared/lib/flows-window.ts";
import { RuntimeProvider, Slot } from "../packages/shared/data-framework/src/index.ts";
import { SlotFills } from "../packages/shared/plugin-framework/src/index.ts";
import { PluginSlotsContext } from "../packages/shared/plugin-framework/src/react/index.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { FIXTURE_WINDOW, sidebarWorldOf } from "./flows-sidebar-world.ts";
import type { SidebarScene, SidebarWorld } from "./flows-sidebar-world.ts";
import { drawnPlate } from "./flows-frame-plates.tsx";
import { measured, pixelsOf, quietOverlays, restoreOverlays, underlaidNativePage } from "./flows-frame-probe.ts";
import { SPLIT_SIDES, sidebarSceneOf, splitOfScene } from "./flows-frame-scenes.ts";
import { BARE_SCREEN } from "./places-fixture.ts";

const SIDEBAR_FILLS = [
	{ slot: "sumi-host.title-tabs", pluginId: "flows-sidebar", kind: "add" as const, component: SidebarTitle },
	{ slot: "sumi-host.frame-start", pluginId: "flows-sidebar", kind: "add" as const, component: FlowsSidebar },
];
const BOARD_FILLS = [
	{ slot: "sumi-host.title-tabs", pluginId: "flow-strip", kind: "add" as const, component: FlowStrip },
	{ slot: "sumi-host.pane-board", pluginId: "flow-board", kind: "replace" as const, component: FlowBoard },
];
const SPLIT_FLOW = "composer-redesign";
const SPLIT_TAB = "composer-redesign-1";
const NO_BOUNDS = { left: { leastPx: 0, usualPx: 0 }, chat: { leastPx: 0, usualPx: 0 }, plateLeastPx: 0 };

declare global {
	interface Window {
		__spoilUndo: () => Promise<void>;
		__stoppedTurns: readonly unknown[];
		__taps: readonly unknown[];
		__flowsSidebar: () => Promise<unknown>;
		__archive: (flowId: string) => Promise<unknown>;
		__projects: (request: keyof typeof navigation.projects, ask: unknown) => Promise<unknown>;
		__folders: (request: keyof typeof navigation.folders, ask: unknown) => Promise<unknown>;
		__flows: (request: keyof typeof navigation.flows, ask: unknown) => Promise<unknown>;
		__chrome: {
			readonly hasOwnDrag: (target: Element) => boolean;
			readonly isControl: (target: Element) => boolean;
		};
		__frame: {
			readonly measured: typeof measured;
			readonly underlaidNativePage: typeof underlaidNativePage;
			readonly pixelsOf: typeof pixelsOf;
			readonly quietOverlays: typeof quietOverlays;
			readonly restoreOverlays: typeof restoreOverlays;
		};
	}
}

window.__chrome = { hasOwnDrag, isControl };
window.__frame = { measured, underlaidNativePage, pixelsOf, quietOverlays, restoreOverlays };

function PageZone({ isBoard }: { readonly isBoard: boolean }): ReactElement {
	if (!isBoard) {
		return <div className="flows-page-plate" />;
	}

	return <PaneBoardSlot drawn={drawnPlate} chatPx={0} bounds={NO_BOUNDS} onChatPx={() => undefined} />;
}

async function openedSplit(world: SidebarWorld, side: "right" | "bottom"): Promise<void> {
	const flow = { window: FIXTURE_WINDOW, flowId: SPLIT_FLOW };
	await world.app.send(navigation.flows.open, { ...flow, at: { window: FIXTURE_WINDOW, screen: BARE_SCREEN } });
	const split = await world.app.send(navigation.flowPanes.split, {
		...flow,
		paneId: `pane-${SPLIT_FLOW}`,
		side,
		tabId: SPLIT_TAB,
	});

	if (!split.ok) {
		throw new Error(split.reason);
	}
}

async function main(): Promise<void> {
	const asked = location.hash.slice(1) || "inbox";
	const split = splitOfScene(asked);
	const isBoard = split !== null;
	const scene = sidebarSceneOf(asked, split) as SidebarScene;
	const fills = new SlotFills(isBoard ? [...SIDEBAR_FILLS, ...BOARD_FILLS] : SIDEBAR_FILLS);
	const world = await sidebarWorldOf(scene);
	const side = split === null ? null : SPLIT_SIDES[split];

	if (side !== null) {
		await openedSplit(world, side);
	}

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
	window.__stoppedTurns = world.stoppedTurns;
	window.__taps = world.taps;
	window.__projects = (request, ask) => world.app.send(navigation.projects[request] as never, ask as never);
	window.__folders = (request, ask) => world.app.send(navigation.folders[request] as never, ask as never);
	window.__flows = (request, ask) => world.app.send(navigation.flows[request] as never, ask as never);
	window.__flowsSidebar = () => world.app.send(navigation.flows.sidebar, { window: FIXTURE_WINDOW });
	window.__archive = (flowId) => world.app.send(navigation.flows.archive, { flowId });

	const holder = document.getElementById("frame");

	if (!holder) {
		throw new Error("flows sidebar page: no #frame");
	}

	createRoot(holder).render(
		<RuntimeProvider runtime={world.app}>
			<TabFaceContext.Provider value={MenuTabFace}>
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
										<header className="wg-chat-head">
											<TrailButtons />
										</header>
										<PageZone isBoard={isBoard} />
									</div>
								</div>
								<TooltipHost />
							</div>
						</FlowWindowContext.Provider>
					</FlowsWindowContext.Provider>
				</PluginSlotsContext.Provider>
			</TabFaceContext.Provider>
		</RuntimeProvider>,
	);
}

void main();
