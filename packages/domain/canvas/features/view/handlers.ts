import { handler } from "@widgetarium/core/requests";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import { CameraQuery, KeepCameraCommand, ModeQuery, SetModeCommand } from "./contract.js";
import { CanvasClientModule } from "../../module.js";

export const CameraQueryHandler = handler(CameraQuery, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.watch((_input, { canvasStore }, changed) => canvasStore.watch(["camera"], changed))
	.handle((_input, { canvasStore }) => ({ camera: canvasStore.now().camera }));

export const KeepCameraCommandHandler = handler(KeepCameraCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ camera }, { canvasStore }) => {
		canvasStore.change({ camera }, "camera moved");
	});

export const ModeQueryHandler = handler(ModeQuery, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.watch((_input, { canvasStore }, changed) => canvasStore.watch(["mode"], changed))
	.handle((_input, { canvasStore }) => ({ mode: canvasStore.now().mode }));

export const SetModeCommandHandler = handler(SetModeCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ mode }, { canvasStore }) => {
		canvasStore.changeOpening({ mode }, `${mode} mode`);
	});
