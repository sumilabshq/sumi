import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { startGpuCanvas } from "../packages/shared/gpu/index.ts";
import { ModuleRegistry } from "../packages/shared/core/src/engine/module-registry.js";
import { registerPacks } from "../packages/shared/core/src/engine/packs.js";
import { NO_HOST } from "../packages/shared/core/src/engine/host-none.js";
import type { DrawnState } from "@widgetarium/canvas";
import { frameIdOf } from "../packages/domain/canvas/shared/lib/field/frame-keys.ts";
import { FixedWidgetDrawingGateway, FixedDesignFolderGateway, canvasPartsOver } from "./canvas-hosts.ts";
import { corePack } from "../packages/shared/packs/core/src/index.js";
import { CANVAS_OPENED_ON, DesignStage } from "../apps/studio/src/canvas/design-stage.ts";
import { Plate, PlateCrumb } from "@widgetarium/shell";
import { loadFixtureCanvasKit, loadFixtureFonts } from "./gpu-canvas-fixture.tsx";
import { DESIGN_FRAMES, DESIGN_SCREEN, TASKS_CARD, TASKS_WIDGET } from "./gpu-design-canvas-frames.ts";
import { benchedPan, lookedAtFrame } from "./gpu-design-canvas-moves.ts";
import * as broken from "./gpu-design-fixture-broken.tsx";
import * as dialogOpen from "./gpu-design-fixture-dialog.tsx";
import * as kitPanel from "./gpu-design-fixture-kit.tsx";
import * as tags from "./gpu-design-fixture-tags.tsx";
import * as taskList from "./studio-fixture-widget.tsx";
import { boom, reportsFailures, stackOf } from "./page-harness.ts";

reportsFailures();
registerPacks(corePack);

const VIEW = { width: 1280, height: 800 };
const NOT_HERE = "not on this test page";
const IN_PLATE = { isInPlate: true };
const PLATE_CRUMB = { first: "Canvas", second: "Farm" };
const registry = new ModuleRegistry({
	"fixture-tags": tags,
	[TASKS_WIDGET]: taskList,
	"kit-panel": kitPanel,
	"dialog-open": dialogOpen,
	broken,
});
const states: DrawnState[] = DESIGN_FRAMES.map(({ state, widget, props }) => ({
	name: state,
	board: null,
	picture: { widget, props, mounts: null },
}));
const TEST_HOST = {
	...NO_HOST,
	can: { catalogue: false, fullscreen: false, subscribe: false, network: false, renderMarkdown: false },
	slot: (): never => {
		throw new Error(NOT_HERE);
	},
};
const designFolderGateway = new FixedDesignFolderGateway(async () => ({
	screens: [{ name: DESIGN_SCREEN, states }],
	references: [],
	widgets: [
		{
			id: TASKS_WIDGET,
			isFromCatalogue: false,
		},
	],
}));
const widgetDrawingGateway = new FixedWidgetDrawingGateway({ registry, host: TEST_HOST });
const supply = { startCanvas: startGpuCanvas, loadCanvasKit: loadFixtureCanvasKit, loadFonts: loadFixtureFonts };

const root = document.getElementById("root");
const reactRoot = root ? createRoot(root) : null;

function draw(): void {
	reactRoot?.render(
		h(Plate, {
			side: "app",
			label: "Farm",
			edgeStart: null,
			lead: null,
			crumb: h(PlateCrumb, { words: PLATE_CRUMB, isPressable: false }),
			more: null,
			edgeEnd: null,
			children: h(DesignStage, {
				app: "Farm",
				opening: { ...CANVAS_OPENED_ON, mode: "pointer" },
				size: VIEW,
				shell: IN_PLATE,
				partsOf: ({ opened }) =>
					canvasPartsOver({ opened, gpu: supply }, { designFolderGateway, widgetDrawingGateway }),
			}),
		}),
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
		cardFrameId: frameIdOf(TASKS_WIDGET, TASKS_CARD),
		panBench: benchedPan,
		lookAtFrame: lookedAtFrame,
	},
});
