import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { PluginSlotsContext } from "@widgetarium/plugin-framework/react";
import { RuntimeProvider } from "../packages/shared/data-framework/src/index.ts";
import { homeLayout } from "../plugins/tabs/flows-home/data/home-layout/generated/contract.ts";
import { homeLayout as homeLayoutModule } from "../plugins/tabs/flows-home/data/home-layout/generated/module.ts";
import { MemoryStudioWindowGateway } from "../plugins/tabs/navigation/data/app-host/gateways/studio-window/memory.gateway.ts";
import { flowsMove } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-moves.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { TabFaceContext } from "../plugins/sumi-host/src/index.ts";
import { builtInPluginState, startSumiPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";
import { MenuTabFace } from "../apps/studio/src/features/app-host/ui/tab-face/menu-tab-face.tsx";
import { FlowWindowContext } from "../plugins/tabs/flow-strip/src/shared/lib/flow-window-context.ts";
import { FlowStrip } from "../plugins/tabs/flow-strip/src/features/flow-header/ui/flow-strip/flow-strip.tsx";
import { FlowBoard } from "../plugins/tabs/flow-board/src/features/flow-board/ui/flow-board/flow-board.tsx";
import { studioFakesOf } from "./app-host-fixture.ts";
import { MAIN, chatFlow, flowsIn, standOver } from "./flows-stand.ts";
import { BARE_SCREEN } from "./places-fixture.ts";

declare global {
	interface Window {
		__home: {
			readonly flowId: () => string;
			readonly layout: () => Promise<unknown>;
			readonly arrangement: () => Promise<unknown>;
			readonly setups: () => Promise<unknown>;
			readonly pageCalls: readonly string[];
			readonly flowsOpened: () => Promise<unknown>;
		};
	}
}

const SETUPS_FROM: readonly (readonly [number, string])[] = [
	[1, "Chat and canvas"],
	[2, "Chat and browser"],
	[4, "Chat and terminal"],
	[5, "Code review"],
];
const HOUR_MS = 3_600_000;
const RECENT_AGES_MS: Readonly<Record<string, number>> = {
	[chatFlow(3)]: 20_000,
	[chatFlow(2)]: 2 * HOUR_MS,
	[chatFlow(5)]: 26 * HOUR_MS,
};

const started = startSumiPlugins(builtInPluginState());
const stand = standOver(true);
const fakes = studioFakesOf({
	places: stand.tabs,
	studioWindow: new MemoryStudioWindowGateway("fixture"),
	extraModules: [homeLayoutModule({})],
});
let flowId = "";
const run = (request: Parameters<typeof stand.app.send>[0], input: unknown): Promise<unknown> =>
	(stand.app.send as (request: unknown, input: unknown) => Promise<unknown>)(request, input);

function Probe({ label }: { readonly label: string }): ReactElement {
	return (
		<div className="wg-shell-plate demo-plate">
			<div className="demo-page">{label}</div>
		</div>
	);
}

function drawn(view: { readonly kind: string; readonly chatId?: string | undefined; readonly tabId?: string | null }): ReactElement {
	if (view.kind === "chat") {
		return <Probe label={`chat ${view.chatId ?? ""}`} />;
	}

	return <Probe label={view.tabId === null || view.tabId === undefined ? "old new-tab page" : `page ${view.tabId}`} />;
}

async function seedSetups(): Promise<void> {
	for (const [chat, name] of SETUPS_FROM) {
		await run(navigation.setups.saveFrom, { flowId: chatFlow(chat), name });
	}
}

async function seedRecency(): Promise<void> {
	const now = Date.now();
	await stand.tabs.movePlaces(
		flowsMove(({ flows }) => ({
			flows: {
				...flows,
				flows: flows.flows.map((flow, at) => ({ ...flow, lastOpenedAt: now - (RECENT_AGES_MS[flow.id] ?? (at + 30) * HOUR_MS) })),
			},
			reason: "demo: recent flows",
			value: null,
		})),
	);
}

async function openNewFlow(): Promise<void> {
	const made = (await run(navigation.flows.create, { name: "New flow", place: { folderId: null, before: null } })) as { readonly flowId: string };
	flowId = made.flowId;
	await run(navigation.flows.open, { window: MAIN, flowId, at: { window: MAIN, screen: BARE_SCREEN } });
}

async function arrange(): Promise<void> {
	await seedSetups();
	await openNewFlow();
	await seedRecency();
}

const answerOf = async (read: Promise<{ readonly ok: boolean; readonly output?: unknown }>): Promise<unknown> => (await read).output;

window.__home = {
	flowId: () => flowId,
	layout: async () => (await flowsIn(stand)).flows.find(({ id }) => id === flowId)?.layout,
	arrangement: () => answerOf(fakes.studioApp.send(homeLayout.arrangement.all)),
	setups: () => answerOf(fakes.studioApp.send(navigation.setups.all)),
	pageCalls: fakes.pages.calls,
	flowsOpened: async () => (await flowsIn(stand)).windowFlows,
};

const BOARD_PROPS = {
	drawn,
	empty: <div className="demo-page">No flow</div>,
	chatPx: 0,
	bounds: {},
	onChatPx: () => undefined,
} as never;

function Demo(): ReactElement {
	return (
		<PluginSlotsContext.Provider value={started.slotFills}>
			<RuntimeProvider runtime={fakes.studioApp}>
				<FlowWindowContext.Provider value={MAIN}>
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
		</PluginSlotsContext.Provider>
	);
}

void arrange().then(() => {
	const holder = document.getElementById("demo");

	if (holder === null) {
		throw new Error("flows home page: no #demo");
	}

	createRoot(holder).render(<Demo />);
});
