import type { ReactNode } from "react";
import { fitCamera } from "./camera.js";
import type { Camera, Viewport } from "./camera.js";
import { arrangeFrames } from "./canvas-view.js";
import type { CanvasView } from "./canvas-view.js";
import { unknownClassWords } from "./class-words.js";
import { mountFrame } from "./frame-render.js";
import type { MountedFrame } from "./frame-render.js";
import { FrameRoot } from "./frame-root.js";
import type { FrameSpec } from "./frame-root.js";
import type { GpuContext } from "./gpu-context.js";
import type { GpuTokens } from "./gpu-tokens.js";
import type { SceneNode } from "./scene-node.js";
import { ViewPointer } from "./view-pointer.js";
import type { PointerSink } from "./view-pointer.js";
import type { WorkSummary } from "./work-log.js";

export interface GpuFrameSpec extends FrameSpec {
	readonly element: ReactNode;
}

export interface CanvasPoint {
	readonly x: number;
	readonly y: number;
}

export interface GpuStats {
	readonly frames: number;
	readonly work: WorkSummary;
	readonly rastersMade: number;
	readonly tilesMade: number;
	readonly textureBytes: number;
	readonly unknownClasses: readonly string[];
}

export interface GpuCanvas {
	readonly pointer: PointerSink;
	addFrame(spec: GpuFrameSpec): void;
	renderFrame(id: string, element: ReactNode): void;
	removeFrame(id: string): void;
	camera(): Camera;
	setCamera(camera: Camera): void;
	fitAll(): void;
	focusFrame(id: string, zoom: number, at: CanvasPoint): void;
	locateText(id: string, text: string): CanvasPoint | null;
	textIn(id: string, includes: string): string | null;
	setTokens(tokens: GpuTokens): void;
	resize(viewport: Viewport): void;
	stats(): GpuStats;
	stop(): void;
}

interface HeldFrame {
	readonly root: FrameRoot;
	readonly mounted: MountedFrame;
}

export function createGpuCanvas(context: GpuContext, view: CanvasView, setCursor: (cursor: string) => void): GpuCanvas {
	const held = new Map<string, HeldFrame>();
	const rootOf = (id: string): FrameRoot | null => held.get(id)?.root ?? null;
	const rearrange = (): void => {
		arrangeFrames(view.frames);
		view.requestFrame();
	};
	return {
		pointer: new ViewPointer(view, setCursor),
		addFrame: (spec) => {
			const root = new FrameRoot(spec, context);
			const mounted = mountFrame(root);
			held.set(spec.id, { root, mounted });
			view.frames.push(root);
			mounted.render(spec.element);
			rearrange();
		},
		renderFrame: (id, element) => held.get(id)?.mounted.render(element),
		removeFrame: (id) => {
			if (released(view, held, id)) rearrange();
		},
		camera: () => ({ ...view.camera }),
		setCamera: (camera) => {
			Object.assign(view.camera, camera);
			view.requestFrame();
		},
		fitAll: () => {
			fitCamera(view.camera, view.frames, view.viewport);
			view.requestFrame();
		},
		focusFrame: (id, zoom, at) => focusOn(view, rootOf(id), zoom, at),
		locateText: (id, text) => locate(view.camera, rootOf(id), text),
		textIn: (id, includes) => {
			const root = rootOf(id);
			return root ? (findText(root.root, (text) => text.includes(includes))?.text ?? null) : null;
		},
		setTokens: (tokens) => view.setTokens(tokens),
		resize: (viewport) => view.resize(viewport),
		stats: () => statsOf(view),
		stop: () => {
			for (const id of [...held.keys()]) released(view, held, id);
			view.stop();
		},
	};
}

function released(view: CanvasView, held: Map<string, HeldFrame>, id: string): boolean {
	const frame = held.get(id);
	if (!frame) return false;
	held.delete(id);
	frame.mounted.unmount();
	view.frames.splice(view.frames.indexOf(frame.root), 1);
	view.forget(frame.root);
	frame.root.dispose();
	return true;
}

function focusOn(view: CanvasView, root: FrameRoot | null, zoom: number, at: CanvasPoint): void {
	if (!root) return;
	view.camera.zoom = zoom;
	view.camera.x = -(root.x + at.x) * zoom;
	view.camera.y = -(root.y + at.y) * zoom;
	view.requestFrame();
}

function locate(camera: Camera, root: FrameRoot | null, text: string): CanvasPoint | null {
	const box = root ? findText(root.root, (seen) => seen === text)?.parent?.box : undefined;
	if (!root || !box) return null;
	return {
		x: (root.x + box.x + box.w / 2) * camera.zoom + camera.x,
		y: (root.y + box.y + box.h / 2) * camera.zoom + camera.y,
	};
}

function findText(node: SceneNode, matches: (text: string) => boolean): SceneNode | undefined {
	if (node.type === "Text" && matches(node.text)) return node;
	for (const child of node.children) {
		const found = findText(child, matches);
		if (found) return found;
	}
	return undefined;
}

function statsOf(view: CanvasView): GpuStats {
	return {
		frames: view.frames.length,
		work: view.work.take(),
		rastersMade: view.rasters.madeTotal,
		tilesMade: view.tiles.madeTotal,
		textureBytes: view.rasters.bytes() + view.tiles.bytes(),
		unknownClasses: unknownClassWords(),
	};
}
