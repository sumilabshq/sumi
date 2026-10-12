import type { ReactNode } from "react";
import { fitCamera } from "./camera.js";
import type { Camera, Viewport } from "./camera.js";
import { arrangeFrames } from "../frames/arrange-frames.js";
import type { CanvasView } from "./canvas-view.js";
import { unknownClassWords } from "../style/class-words.js";
import { mountFrame } from "../frames/frame-render.js";
import type { MountedFrame } from "../frames/frame-render.js";
import { FrameRoot } from "../frames/frame-root.js";
import type { FrameSpec } from "../frames/frame-root.js";
import type { GpuContext } from "./gpu-context.js";
import type { GpuTokens } from "../style/gpu-tokens.js";
import type { SceneNode } from "../nodes/scene-node.js";
import { ViewPointer } from "../frames/view-pointer.js";
import type { PointerSink } from "../frames/view-pointer.js";
import type { WorkSummary } from "./work-log.js";

export interface GpuFrameSpec extends FrameSpec {
	readonly element: ReactNode;
	readonly onFailure?: ((failure: Error) => void) | undefined;
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
	moveFrame(id: string, at: CanvasPoint): void;
	camera(): Camera;
	setCamera(camera: Camera): void;
	drawAt(camera: Camera): void;
	isPressableAt(x: number, y: number): boolean;
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
	const pointer = new ViewPointer(view, setCursor);
	const rootOf = (id: string): FrameRoot | null => held.get(id)?.root ?? null;
	const rearrange = (): void => {
		arrangeFrames(view.frames);
		view.requestFrame();
	};
	return {
		pointer,
		addFrame: (spec) => {
			const root = new FrameRoot(spec, context);
			const mounted = mountFrame(root, spec.onFailure);
			held.set(spec.id, { root, mounted });
			view.frames.push(root);
			mounted.render(spec.element);
			rearrange();
		},
		renderFrame: (id, element) => held.get(id)?.mounted.render(element),
		removeFrame: (id) => {
			if (released(view, held, id)) rearrange();
		},
		moveFrame: (id, at) => {
			const root = rootOf(id);
			if (!root || (root.x === at.x && root.y === at.y)) return;
			Object.assign(root, at);
			view.tiles.dropAll();
			view.requestFrame();
		},
		camera: () => ({ ...view.camera }),
		setCamera: (camera) => {
			Object.assign(view.camera, camera);
			view.requestFrame();
		},
		drawAt: (camera) => {
			Object.assign(view.camera, camera);
			view.renderNow();
		},
		isPressableAt: (x, y) => pointer.pressableAt(x, y),
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
