// TODO: the design canvas draws its frames as HTML; it becomes this module's first consumer once a spec says how
export { startGpuCanvas } from "./start-gpu-canvas.js";
export type { GpuCanvasStart } from "./start-gpu-canvas.js";
export { startGpuCanvasInWorker } from "./gpu-canvas-in-worker.js";
export type { GpuCanvasRemote, GpuWorkerStart } from "./gpu-canvas-in-worker.js";
export { serveGpuCanvas } from "./serve-gpu-canvas.js";
export type { GpuWorkerServe } from "./serve-gpu-canvas.js";
export type { GpuCanvas, GpuFrameSpec, GpuStats, CanvasPoint } from "./gpu-canvas.js";
export type { GpuFont } from "./gpu-engine.js";
export type { GpuSwitches } from "./canvas-view.js";
export type { Camera, Viewport } from "./camera.js";
export type { GpuTokens, Rgba } from "./gpu-tokens.js";
export type { MessageScope } from "./worker-protocol.js";
export type { WorkSummary } from "./work-log.js";
export { COLOUR_WORDS, LENGTH_WORDS } from "./gpu-tokens.js";
export { GpuView } from "./gpu-view.js";
export { GpuText } from "./gpu-text.js";
export { GpuIcon } from "./gpu-icon.js";
