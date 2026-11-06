import { Profiler, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { ChatsColumn } from "../apps/studio/src/features/workspaces/ui/chats-column/chats-column.tsx";
import { CommandMenu } from "../apps/studio/src/features/command-menu/ui/command-menu/command-menu.tsx";
import { createStudioState } from "../apps/studio/src/legacy/studio-state.js";
import { TEAR_OFF_ASKED, exactStudio } from "./studio-exact-fixture.ts";
import { AppProvider } from "../packages/shared/framework/src/index.ts";
import { PlaceInViewCommand } from "../packages/domain/app-host/generated/contract.ts";
import { boom, reportsFailures, stackOf } from "./page-harness.ts";
import type { PlacedTabs } from "../packages/state/places/shared/schema/tabs.schema.ts";

reportsFailures();

interface Counted {
	commits: number;
}

const counted: Counted = { commits: 0 };
const exact = exactStudio();
const state = createStudioState(exact.studioApp);
const placedNow: { tabs: PlacedTabs | null } = { tabs: null };
const readPlaced = (): void => void exact.places.placedTabs().then((tabs) => (placedNow.tabs = tabs));
readPlaced();
exact.places.placedTabsChanged(readPlaced);

Reflect.set(window, "__SIDEBAR__", {
	counted,
	tearOffAsked: () => TEAR_OFF_ASKED.join(" | "),
	switchChat: exact.switchChat,
	holdElsewhere: exact.holdElsewhere,
	splitTabs: async (tabId: string, targetTabId: string) =>
		(await exact.studioApp.send(PlaceInViewCommand, { tabId, targetTabId, side: "right", isPaneMoved: false })).ok,
	moment: () => placedNow.tabs,
	essentials: () => exact.essentials.essentials(),
	shownView: () => state.now().view,
	keepEssentials: (count: number) => {
		const kept = exact.essentials.essentials();

		if (kept !== null) {
			exact.essentials.saveEssentials({ ...kept, essentials: kept.essentials.slice(0, count) });
		}
	},
});

const FRAME =
	"display:flex;gap:8px;padding:8px;box-sizing:border-box;width:100vw;height:100vh;background:var(--sumi-frame)";

try {
	const root = document.getElementById("root");

	if (root === null) {
		throw new Error("the page has no #root");
	}

	root.setAttribute("style", FRAME);
	root.classList.add("wg-studio");
	const studioLayer = document.createElement("div");
	studioLayer.className = "wg-root wg-portal wg-kit-portal-layer is-studio";
	document.body.appendChild(studioLayer);
	createRoot(root).render(
		<AppProvider app={exact.studioApp}>
			<Profiler
				id="tabs"
				onRender={() => {
					counted.commits += 1;
				}}
			>
				<div style={{ width: 268, flex: "none", display: "flex", minHeight: 0 }} data-test-left="">
					<ChatsColumn />
				</div>
				<main
					style={{
						flex: 1,
						minWidth: 0,
						background: "var(--sumi-plate)",
						borderRadius: 14,
						boxShadow: "var(--sumi-shadow-plate)",
					}}
					data-exact-plate=""
				/>
			</Profiler>
			<CommandMenu />
		</AppProvider>,
	);
} catch (failure: unknown) {
	boom(stackOf(failure));
}
