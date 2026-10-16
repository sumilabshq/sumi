import { handler } from "@widgetarium/core/requests";
import { CanvasHost } from "../../adapters/canvas-host/canvas-host.adapter.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import {
	CameraQuery,
	ChooseRendererCommand,
	KeepCameraCommand,
	ModeQuery,
	RendererSwitchQuery,
	SetModeCommand,
} from "./contract.js";

export const cameraHandler = handler(CameraQuery, {
	inject: { canvasStore: CanvasStore },
	run: (_input, { canvasStore }) => ({ camera: canvasStore.now().camera }),
	watch: (_input, { canvasStore }, changed) => canvasStore.watch(["camera"], changed),
});

export const chooseRendererHandler = handler(ChooseRendererCommand, {
	inject: { canvasStore: CanvasStore },
	run: ({ renderer }, { canvasStore }) => canvasStore.change({ renderer }, `draw pages as ${renderer}`),
});

export const keepCameraHandler = handler(KeepCameraCommand, {
	inject: { canvasStore: CanvasStore },
	run: ({ camera }, { canvasStore }) => canvasStore.change({ camera }, "camera moved"),
});

export const modeHandler = handler(ModeQuery, {
	inject: { canvasStore: CanvasStore },
	run: (_input, { canvasStore }) => ({ mode: canvasStore.now().mode }),
	watch: (_input, { canvasStore }, changed) => canvasStore.watch(["mode"], changed),
});

export const rendererSwitchHandler = handler(RendererSwitchQuery, {
	inject: { canvasStore: CanvasStore, canvasHost: CanvasHost },
	run: (_input, { canvasStore, canvasHost }) => ({
		isShown: canvasHost.gpu !== null,
		renderer: canvasStore.now().renderer,
	}),
	watch: (_input, { canvasStore }, changed) => canvasStore.watch(["renderer"], changed),
});

export const setModeHandler = handler(SetModeCommand, {
	inject: { canvasStore: CanvasStore },
	run: ({ mode }, { canvasStore }) => canvasStore.change({ mode }, `${mode} mode`),
});
