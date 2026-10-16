import { handler } from "@widgetarium/core/requests";
import { CanvasHost } from "../../adapters/canvas-host/canvas-host.adapter.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import {
	CameraQuery,
	ChooseRendererCommand,
	KeepCameraCommand,
	ModeQuery,
	RendererSwitchQuery,
	SetModeCommand,
} from "./contract.js";
import { CanvasClientModule } from "../../module.js";

export const CameraQueryHandler = handler(CameraQuery, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.watch((_input, { canvasStore }, changed) => canvasStore.watch(["camera"], changed))
	.handle((_input, { canvasStore }) => ({ camera: canvasStore.now().camera }));

export const ChooseRendererCommandHandler = handler(ChooseRendererCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ renderer }, { canvasStore }) => canvasStore.change({ renderer }, `draw pages as ${renderer}`));

export const KeepCameraCommandHandler = handler(KeepCameraCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ camera }, { canvasStore }) => canvasStore.change({ camera }, "camera moved"));

export const ModeQueryHandler = handler(ModeQuery, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.watch((_input, { canvasStore }, changed) => canvasStore.watch(["mode"], changed))
	.handle((_input, { canvasStore }) => ({ mode: canvasStore.now().mode }));

export const RendererSwitchQueryHandler = handler(RendererSwitchQuery, CanvasClientModule)
	.inject({ canvasStore: CanvasStore, canvasHost: CanvasHost })
	.watch((_input, { canvasStore }, changed) => canvasStore.watch(["renderer"], changed))
	.handle((_input, { canvasStore, canvasHost }) => ({
		isShown: canvasHost.gpu !== null,
		renderer: canvasStore.now().renderer,
	}));

export const SetModeCommandHandler = handler(SetModeCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ mode }, { canvasStore }) => canvasStore.change({ mode }, `${mode} mode`));
