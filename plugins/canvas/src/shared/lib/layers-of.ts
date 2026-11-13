import type { Layer } from "@sumi/canvas-work/implementation";

export type { Layer } from "@sumi/canvas-work/implementation";

export type LayerKind = Layer["kind"];

const SKIPPED = new Set(["SCRIPT", "STYLE", "LINK", "META", "TEMPLATE", "NOSCRIPT", "TITLE"]);
const PICTURES = new Set(["IMG", "SVG", "PICTURE", "VIDEO", "CANVAS"]);
const CONTROLS = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A", "LABEL"]);
const FRAMES = new Set(["SECTION", "MAIN"]);
const MAX_LAYER_DEPTH = 8;
const MAX_TEXT_NAME_LENGTH = 40;
const MAX_GIVEN_NAME_LENGTH = 120;

export function parseHtmlDocument(html: string): Document {
	return new DOMParser().parseFromString(html, "text/html");
}

export function layersOf(html: string): readonly Layer[] {
	return childLayersOf(parseHtmlDocument(html).body, "", 0);
}

export function findElementAtPath(document: Document, path: string): Element | null {
	return path
		.split(".")
		.reduce<Element | null>((element, at) => drawnChildrenOf(element)[Number(at)] ?? null, document.body);
}

export function serializeDocument(document: Document, source: string): string {
	const doctype = /^\s*<!doctype/i.test(source) ? "<!doctype html>\n" : "";
	return `${doctype}${document.documentElement.outerHTML}`;
}

function childLayersOf(parent: Element, path: string, depth: number): Layer[] {
	if (depth >= MAX_LAYER_DEPTH) {
		return [];
	}

	return drawnChildrenOf(parent).map((element, at) => layerOf(element, childPathOf(path, at), depth));
}

function childPathOf(path: string, at: number): string {
	return path === "" ? `${at}` : `${path}.${at}`;
}

function drawnChildrenOf(element: Element | null): readonly Element[] {
	if (element === null) {
		return [];
	}

	return [...element.children].filter(({ tagName }) => !SKIPPED.has(tagName.toUpperCase()));
}

function layerOf(element: Element, path: string, depth: number): Layer {
	const kind = kindOf(element);
	const holdsLayers = kind === "group" || kind === "frame";
	return {
		path,
		name: givenNameOf(element) ?? fallbackNameOf(element, kind),
		kind,
		children: holdsLayers ? childLayersOf(element, path, depth + 1) : [],
	};
}

function kindOf(element: Element): LayerKind {
	const tag = element.tagName.toUpperCase();

	if (PICTURES.has(tag)) {
		return "picture";
	}

	if (CONTROLS.has(tag)) {
		return "control";
	}

	if (drawnChildrenOf(element).length > 0) {
		return FRAMES.has(tag) ? "frame" : "group";
	}

	return textOf(element) === "" ? "shape" : "text";
}

function givenNameOf(element: Element): string | null {
	const given = (element.getAttribute("data-name") ?? element.getAttribute("aria-label") ?? "").trim();
	return given === "" ? null : given.slice(0, MAX_GIVEN_NAME_LENGTH);
}

function fallbackNameOf(element: Element, kind: LayerKind): string {
	const text = textOf(element);
	const isNamedByText = (kind === "text" || kind === "control") && text !== "";

	if (isNamedByText) {
		return text.slice(0, MAX_TEXT_NAME_LENGTH);
	}

	return element.id === "" ? element.tagName.toLowerCase() : element.id;
}

function textOf(element: Element): string {
	return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}
