import { isObject } from "@widgetarium/core/engine/is-object.js";
import type { Camera, Viewport } from "./camera.js";
import type { GpuSwitches } from "./canvas-view.js";
import type { CanvasPoint } from "./gpu-canvas.js";
import type { GpuTokens } from "./gpu-tokens.js";
import type { FromWorker, GpuQuestion, PointerMessage, ToWorker } from "./worker-protocol.js";

type Fields = Readonly<Record<string, unknown>>;

const POINTER_FIELDS: Readonly<Record<PointerMessage["act"], readonly string[]>> = {
	move: ["x", "y"],
	down: ["x", "y", "button"],
	up: ["x", "y"],
	leave: [],
	wheel: ["x", "y", "deltaX", "deltaY"],
};

export function isToWorker(value: unknown): value is ToWorker {
	if (!isObject(value)) return false;
	if (value["kind"] === "start") {
		const drawsOn = value["canvas"] instanceof OffscreenCanvas;
		return drawsOn && isViewport(value["viewport"]) && isTokens(value["tokens"]) && isSwitches(value["switches"]);
	}
	if (value["kind"] === "pointer") return isPointer(value["pointer"]);
	if (value["kind"] === "resize") return isViewport(value["viewport"]);
	if (value["kind"] === "tokens") return isTokens(value["tokens"]);
	if (value["kind"] === "ask") return typeof value["id"] === "number" && isQuestion(value["question"]);
	return false;
}

export function isFromWorker(value: unknown): value is FromWorker {
	if (!isObject(value)) return false;
	if (value["kind"] === "ready") return true;
	if (value["kind"] === "cursor") return typeof value["cursor"] === "string";
	if (value["kind"] === "answer") return typeof value["id"] === "number" && "value" in value;
	if (value["kind"] === "failed") return typeof value["reason"] === "string";
	return false;
}

export function isCanvasPoint(value: unknown): value is CanvasPoint {
	return isObject(value) && numbersIn(value, ["x", "y"]);
}

export function isCamera(value: unknown): value is Camera {
	return isObject(value) && numbersIn(value, ["x", "y", "zoom"]);
}

function isViewport(value: unknown): value is Viewport {
	return isObject(value) && numbersIn(value, ["width", "height", "dpr"]);
}

function isTokens(value: unknown): value is GpuTokens {
	if (!isObject(value) || !isObject(value["colours"]) || !isObject(value["lengths"])) return false;
	const coloursAreRgba = Object.values(value["colours"]).every(
		(colour) => Array.isArray(colour) && colour.length === 4 && colour.every((channel) => typeof channel === "number"),
	);
	return coloursAreRgba && Object.values(value["lengths"]).every((length) => typeof length === "number");
}

function isSwitches(value: unknown): value is Partial<GpuSwitches> {
	if (!isObject(value)) return false;
	const { tiles, lod, waitForGpu } = value;
	const lodIsKnown = lod === undefined || lod === false || typeof lod === "number";
	return (
		(tiles === undefined || typeof tiles === "boolean") &&
		(waitForGpu === undefined || typeof waitForGpu === "boolean") &&
		lodIsKnown
	);
}

function isPointer(value: unknown): value is PointerMessage {
	if (!isObject(value)) return false;
	const act = value["act"];
	if (act !== "move" && act !== "down" && act !== "up" && act !== "leave" && act !== "wheel") return false;
	return numbersIn(value, POINTER_FIELDS[act]) && (act !== "wheel" || typeof value["zooms"] === "boolean");
}

function isQuestion(value: unknown): value is GpuQuestion {
	if (!isObject(value)) return false;
	const { ask } = value;
	if (ask === "camera" || ask === "fitAll") return true;
	if (ask === "setCamera") return isCamera(value["camera"]);
	if (ask === "locateText") return stringsIn(value, ["frame", "text"]);
	if (ask === "textIn") return stringsIn(value, ["frame", "includes"]);
	if (ask === "focusFrame")
		return stringsIn(value, ["frame"]) && numbersIn(value, ["zoom"]) && isCanvasPoint(value["at"]);
	return false;
}

function numbersIn(fields: Fields, names: readonly string[]): boolean {
	return names.every((name) => typeof fields[name] === "number");
}

function stringsIn(fields: Fields, names: readonly string[]): boolean {
	return names.every((name) => typeof fields[name] === "string");
}
