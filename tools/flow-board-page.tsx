import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { RuntimeProvider } from "../packages/shared/data-framework/src/index.ts";
import { appHost } from "../plugins/tabs/navigation/data/app-host/generated/contract.ts";
import { MemoryStudioWindowGateway } from "../plugins/tabs/navigation/data/app-host/gateways/studio-window/memory.gateway.ts";
import { flowsMove } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-moves.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { TabFaceContext } from "../plugins/sumi-host/src/index.ts";
import type { PaneBoardProps } from "../plugins/sumi-host/src/index.ts";
import { MenuTabFace } from "../apps/studio/src/features/app-host/ui/tab-face/menu-tab-face.tsx";
import { FlowWindowContext } from "../plugins/tabs/flow-strip/src/shared/lib/flow-window-context.ts";
import { FlowStrip } from "../plugins/tabs/flow-strip/src/features/flow-header/ui/flow-strip/flow-strip.tsx";
import { RenameField } from "../plugins/tabs/flow-strip/src/features/pane-tabs/ui/rename-field/rename-field.tsx";
import { FlowBoard } from "../plugins/tabs/flow-board/src/features/flow-board/ui/flow-board/flow-board.tsx";
import { FRAME_LIMITS } from "../packages/state/layout/shared/lib/frame-bounds.ts";
import { studioFakesOf } from "./app-host-fixture.ts";
import { MAIN, SIDE, chatFlow, flowsIn, standOver } from "./flows-stand.ts";
import { BARE_SCREEN } from "./places-fixture.ts";

declare global {
	interface Window {
		__renames: (string | null)[];
		__demo: {
			readonly mounts: Record<string, number>;
			readonly layout: () => Promise<unknown>;
		};
	}
}

const renames: (string | null)[] = [];
window.__renames = renames;

const FLOW = chatFlow(3);
const CHAT = "chat-03";
const LEFT = "pane-3";
const RIGHT = "pane-31";
const EXTRA_TABS = 4;

const mounts: Record<string, number> = {};

function Probe({ label }: { readonly label: string }): ReactElement {
	useState(() => {
		mounts[label] = (mounts[label] ?? 0) + 1;
		return null;
	});
	return (
		<div className="wg-shell-plate demo-plate">
			<div className="demo-page">{label}</div>
		</div>
	);
}

function drawn(view: {
	readonly kind: string;
	readonly chatId?: string | undefined;
	readonly tabId?: string | null;
}): ReactElement {
	if (view.kind === "chat") {
		return <Probe label={`chat ${view.chatId ?? ""}`} />;
	}

	return <Probe label={view.tabId === null || view.tabId === undefined ? "Home" : `page ${view.tabId}`} />;
}

const scenario = location.hash.slice(1) || "side";
const stand = standOver(true);
const fakes = studioFakesOf({
	places: stand.tabs,
	studioWindow: new MemoryStudioWindowGateway("fixture"),
});
const window_ = scenario === "held" ? SIDE : MAIN;
const run = (request: Parameters<typeof stand.app.send>[0], input: unknown): Promise<unknown> =>
	(stand.app.send as (request: unknown, input: unknown) => Promise<unknown>)(request, input);

async function arrange(): Promise<void> {
	const pane = { window: MAIN, flowId: FLOW };
	await run(navigation.flows.open, { ...pane, at: { window: MAIN, screen: BARE_SCREEN } });

	if (scenario === "stacked") {
		await run(navigation.flowPanes.closePane, { ...pane, paneId: RIGHT });
		await run(navigation.flowPanes.split, { ...pane, paneId: LEFT, side: "bottom", tabId: "sub-3-2" });
	}

	if (scenario === "narrow") {
		await run(navigation.flowPanes.split, { ...pane, paneId: LEFT, side: "right", tabId: "sub-3-3" });
		await run(navigation.flowPanes.focus, { ...pane, paneId: LEFT });

		for (let at = 0; at < EXTRA_TABS; at += 1) {
			const opened = await fakes.studioApp.send(appHost.tabActions.openTab, { app: "canvas", list: CHAT });

			if (!opened.ok) {
				throw new Error(opened.reason);
			}
		}
	}

	if (scenario === "held") {
		await stand.tabs.movePlaces(
			flowsMove(({ flows }) => ({
				flows: { ...flows, windowFlows: { ...flows.windowFlows, [MAIN]: FLOW, [SIDE]: FLOW } },
				reason: "demo: two windows show one flow",
				value: null,
			})),
		);
	}
}

window.__demo = {
	mounts,
	layout: async () => (await flowsIn(stand)).flows.find(({ id }) => id === FLOW)?.layout,
};

const BOARD_PROPS: PaneBoardProps = {
	drawn,
	empty: <div className="demo-page">No flow</div>,
	chatPx: 0,
	bounds: FRAME_LIMITS,
	onChatPx: () => undefined,
};

function Demo(): ReactElement {
	return (
		<RuntimeProvider runtime={fakes.studioApp}>
			<FlowWindowContext.Provider value={window_}>
				<TabFaceContext.Provider value={MenuTabFace}>
					<div className="wg-studio wg-root wg-shell is-flat demo-frame">
						<div className="demo-title">
							<FlowStrip />
						</div>
						<div className="wg-shell-body">
							<div className="demo-sidebar" />
							<div className="wg-shell-app-zone demo-zone">
								<FlowBoard {...BOARD_PROPS} />
							</div>
						</div>
					</div>
				</TabFaceContext.Provider>
			</FlowWindowContext.Provider>
		</RuntimeProvider>
	);
}

void arrange().then(() => {
	const holder = document.getElementById("demo");

	if (holder === null) {
		throw new Error("flow board page: no #demo");
	}

	createRoot(holder).render(
		scenario === "rename" ? <RenameField initial="Sub page" onDone={(label) => renames.push(label)} /> : <Demo />,
	);
});
