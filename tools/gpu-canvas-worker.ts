import { serveGpuCanvas } from "../packages/shared/gpu/index.ts";
import { addTranslators, loadFixtureCanvasKit, loadFixtureFonts } from "./gpu-canvas-fixture.tsx";

const WORKER_COPIES = 12;

serveGpuCanvas(self, {
	loadCanvasKit: loadFixtureCanvasKit,
	loadFonts: loadFixtureFonts,
	started: (gpu) => {
		addTranslators(gpu, WORKER_COPIES);
		gpu.fitAll();
	},
});
