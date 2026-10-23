import { Profiler, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { TabsSidebarColumn } from "../apps/studio/src/tabs/tabs-sidebar-column.tsx";
import { createStudioState } from "../apps/studio/src/legacy/studio-state.js";
import { SwitchedChat, exactAppHostParts } from "./studio-exact-fixture.ts";
import { boom, reportsFailures, stackOf } from "./page-harness.ts";

reportsFailures();

interface Counted {
	commits: number;
}

const counted: Counted = { commits: 0 };
const chat = new SwitchedChat();
const state = createStudioState();
const hostParts = exactAppHostParts(state, chat);

Reflect.set(window, "__SIDEBAR__", {
	counted,
	switchChat: (id: string) => chat.switchTo(id),
	moment: () => hostParts.hostTabs.now(),
	essentials: () => hostParts.essentials.now(),
	shownView: () => state.now().view,
	keepEssentials: (count: number) =>
		hostParts.essentials
			.now()
			.essentials.slice(count)
			.forEach((essential) => hostParts.essentials.remove(essential.id)),
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
		<Profiler
			id="tabs"
			onRender={() => {
				counted.commits += 1;
			}}
		>
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
			<TabsSidebarColumn hostParts={hostParts} />
		</Profiler>,
	);
} catch (failure: unknown) {
	boom(stackOf(failure));
}
