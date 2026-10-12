import type { Camera, Viewport } from "../engine/camera.js";
import type { GpuSwitches } from "../engine/canvas-view.js";
import type { CanvasPoint } from "../engine/gpu-canvas.js";
import type { GpuTokens } from "../style/gpu-tokens.js";

export type PointerMessage =
	| { readonly act: "move"; readonly x: number; readonly y: number }
	| { readonly act: "down"; readonly x: number; readonly y: number; readonly button: number }
	| { readonly act: "up"; readonly x: number; readonly y: number }
	| { readonly act: "leave" }
	| {
			readonly act: "wheel";
			readonly x: number;
			readonly y: number;
			readonly deltaX: number;
			readonly deltaY: number;
			readonly zooms: boolean;
	  };

export type GpuQuestion =
	| { readonly ask: "locateText"; readonly frame: string; readonly text: string }
	| { readonly ask: "textIn"; readonly frame: string; readonly includes: string }
	| { readonly ask: "camera" }
	| { readonly ask: "setCamera"; readonly camera: Camera }
	| { readonly ask: "fitAll" }
	| { readonly ask: "focusFrame"; readonly frame: string; readonly zoom: number; readonly at: CanvasPoint };

export type ToWorker =
	| {
			readonly kind: "start";
			readonly canvas: OffscreenCanvas;
			readonly viewport: Viewport;
			readonly tokens: GpuTokens;
			readonly switches: Partial<GpuSwitches>;
	  }
	| { readonly kind: "pointer"; readonly pointer: PointerMessage }
	| { readonly kind: "resize"; readonly viewport: Viewport }
	| { readonly kind: "tokens"; readonly tokens: GpuTokens }
	| { readonly kind: "ask"; readonly id: number; readonly question: GpuQuestion };

export type FromWorker =
	| { readonly kind: "ready" }
	| { readonly kind: "cursor"; readonly cursor: string }
	| { readonly kind: "answer"; readonly id: number; readonly value: unknown }
	| { readonly kind: "failed"; readonly reason: string };

export interface MessageScope {
	postMessage(message: FromWorker): void;
	addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
}
