import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { ModuleRegistry } from "../packages/core/src/engine/module-registry.js";
import { registerPacks } from "../packages/core/src/engine/packs.js";
import { NO_HOST } from "../packages/core/src/engine/host-none.js";
import type { DesignSource, DrawnState } from "../packages/canvas/index.ts";
import { gpuFrameIdOf } from "../packages/canvas/widgets/canvas-field/lib/frame-keys.ts";
import { corePack } from "../packages/packs/core/src/index.js";
import { DesignStage, DESIGN_OPENED_ON } from "../apps/studio/src/canvas/design-stage.ts";
import type { DesignViewState } from "../apps/studio/src/canvas/design-stage.ts";
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
const NOT_HERE = "not on this test page";
const registry = new ModuleRegistry({ "fixture-tags": tags, "task-list": taskList, "kit-panel": kitPanel, broken });
const states: DrawnState[] = DESIGN_FRAMES.map(({ state, widget, props }) => ({
	name: state,
	board: null,
	picture: { widget, props },
}));
const refused = (): Promise<never> => Promise.reject(new Error(NOT_HERE));
const TEST_HOST = {
	...NO_HOST,
	can: { catalogue: false, fullscreen: false, subscribe: false, network: false, renderMarkdown: false },
	slot: (): never => {
		throw new Error(NOT_HERE);
	},
};
const source: DesignSource = {
	design: async () => ({ screens: [{ name: DESIGN_SCREEN, states }], references: [], widgets: [] }),
	docs: async () => [],
	jobs: () => [],
	onJobs: () => () => undefined,
	liveJob: () => null,
	stopJob: refused,
	drawing: () => ({ registry, host: TEST_HOST }),
	onChanged: () => () => undefined,
	addPhotos: refused,
	moveLayer: refused,
	returnToView: refused,
	look: async () => null,
	pickLook: refused,
	pictureOf: null,
};
const supply = { loadCanvasKit: loadFixtureCanvasKit, loadFonts: loadFixtureFonts };

const root = document.getElementById("root");
const reactRoot = root ? createRoot(root) : null;
const viewHeld: { view: DesignViewState } = { view: DESIGN_OPENED_ON };

function draw(): void {
	const stage = h(DesignStage, {
		port: source,
		app: "Farm",
		view: viewHeld.view,
		onView: (view: DesignViewState) => {
			viewHeld.view = view;
			draw();
		},
		size: VIEW,
		gpu: supply,
	});
	reactRoot?.render(stage);
}

try {
	draw();
} catch (failure: unknown) {
	boom(`render: ${stackOf(failure)}`);
}

Object.assign(window, {
	designPage: {
		frameIds: DESIGN_FRAMES.map(({ state, widget }) => gpuFrameIdOf(widget, `${DESIGN_SCREEN} · ${state}`)),
		panBench: benchedPan,
		lookAtFrame: lookedAtFrame,
	},
});
