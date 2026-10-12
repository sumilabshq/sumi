import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { ModuleRegistry } from "../packages/core/src/engine/module-registry.js";
import { registerPacks } from "../packages/core/src/engine/packs.js";
import { NO_DESIGN } from "../packages/studio/src/features/canvas/contract.js";
import type { DesignPort, DrawnState } from "../packages/studio/src/features/canvas/contract.js";
import { corePack } from "../packages/packs/core/src/index.js";
import { DesignStage, DESIGN_OPENED_ON } from "../packages/studio/src/features/canvas/ui/design-stage.js";
import type { DesignViewState } from "../packages/studio/src/features/canvas/ui/design-stage.js";
import { frameIdOf } from "../packages/studio/src/features/canvas/local/design-snapshots.js";
import { loadFixtureCanvasKit, loadFixtureFonts } from "./gpu-canvas-fixture.tsx";
import { DESIGN_FRAMES, DESIGN_SCREEN } from "./gpu-design-canvas-frames.ts";
import { benchedPan, lookedAtFrame } from "./gpu-design-canvas-moves.ts";
import * as broken from "./gpu-design-fixture-broken.tsx";
import * as kitPanel from "./gpu-design-fixture-kit.tsx";
import * as tags from "./gpu-design-fixture-tags.tsx";
import * as taskList from "./studio-fixture-widget.tsx";
import { boom, reportsFailures, stackOf } from "./page-harness.ts";

reportsFailures();
registerPacks(corePack);

const VIEW = { width: 1280, height: 800 };
const registry = new ModuleRegistry({ "fixture-tags": tags, "task-list": taskList, "kit-panel": kitPanel, broken });
const states: DrawnState[] = DESIGN_FRAMES.map(({ state, widget, props }) => ({
	name: state,
	board: null,
	picture: { widget, props },
}));
const port: DesignPort = {
	...NO_DESIGN,
	design: async () => ({ screens: [{ name: DESIGN_SCREEN, states }], references: [], widgets: [] }),
	drawing: () => ({ registry, host: NO_DESIGN.drawing().host }),
	pictureOf: null,
};
const supply = { loadCanvasKit: loadFixtureCanvasKit, loadFonts: loadFixtureFonts };

const root = document.getElementById("root");
const reactRoot = root ? createRoot(root) : null;
const viewHeld: { view: DesignViewState } = { view: DESIGN_OPENED_ON };

function draw(): void {
	const stage = h(DesignStage, {
		port,
		app: "Farm",
		view: viewHeld.view,
		onView: (view: DesignViewState) => {
			viewHeld.view = view;
			draw();
		},
		size: VIEW,
		fieldOf: () => document.querySelector<HTMLElement>(".wg-design-field"),
		gpu: supply,
	});
	reactRoot?.render(
		h("div", { className: "wg-design-view" }, h("div", { className: "wg-mount wg-design-mount wg-portal" }, stage)),
	);
}

try {
	draw();
} catch (failure: unknown) {
	boom(`render: ${stackOf(failure)}`);
}

Object.assign(window, {
	designPage: {
		frameIds: DESIGN_FRAMES.map(({ state, widget }) => frameIdOf(widget, `${DESIGN_SCREEN} · ${state}`)),
		panBench: benchedPan,
		lookAtFrame: lookedAtFrame,
	},
});
