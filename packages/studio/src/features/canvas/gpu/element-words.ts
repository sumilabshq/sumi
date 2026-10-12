import type { HostProps } from "./gpu-context.js";
import { TAG_WORDS } from "./html-tags.js";

export interface WordHolder {
	readonly type: string;
	readonly props: HostProps;
	readonly parent: WordHolder | null;
	readonly children: readonly WordHolder[];
}

const KIT_BASES: ReadonlySet<string> = new Set([
	"wg-kit-btn",
	"wg-kit-icon",
	"wg-kit-pill",
	"wg-kit-field",
	"wg-kit-seg",
	"wg-kit-row",
	"wg-kit-pop",
]);
const PLATE_HOLDERS: ReadonlySet<string> = new Set(["wg-kit-surface", "wg-slot"]);
const MODIFIER = /^is-/;
const HOST_RESET_TAGS: ReadonlySet<string> = new Set(["button", "input", "select", "textarea"]);
const RESET_BY_HOST = /^(?:hover:|active:)?(?:bg-|rounded|border|shadow|[pm][xytrbl]?-)/;
const GROUP = "group";

// TODO: read an inline style prop; only classes and attributes are drawn
export function wordsOfElement(node: WordHolder): string {
	const written = withHostReset(node.type, classWordsOf(node.props));
	const tagWords = TAG_WORDS[node.type] ?? "";
	return [
		tagWords,
		...withKitModifiers(written),
		...plateWordsOf(node, written),
		...segWordsOf(node),
		...groupItemWordsOf(node),
	].join(" ");
}

function classWordsOf(props: HostProps): string[] {
	const { className } = props;
	return typeof className === "string" ? className.split(/\s+/).filter(Boolean) : [];
}

// TRADE-OFF: mirrors the host sheet, which strips a bare control's fill, corner and spacing even when a utility asks for them
function withHostReset(type: string, written: readonly string[]): string[] {
	if (!HOST_RESET_TAGS.has(type) || written.some((word) => word.startsWith("wg-kit"))) return [...written];
	return written.filter((word) => !RESET_BY_HOST.test(word));
}

function withKitModifiers(written: readonly string[]): string[] {
	const bases = written.filter((word) => KIT_BASES.has(word));
	if (bases.length === 0) return [...written];
	return written.flatMap((word) => (MODIFIER.test(word) ? bases.map((base) => `${base}-${word}`) : [word]));
}

function plateWordsOf(node: WordHolder, written: readonly string[]): string[] {
	const surface = node.props["data-surface"];
	if (typeof surface !== "string" || !written.some((word) => PLATE_HOLDERS.has(word))) return [];
	const isInset = surface === GROUP && hasGroupAbove(node.parent);
	return isInset ? [`wg-kit-surface-${surface}`, "wg-kit-surface-inset"] : [`wg-kit-surface-${surface}`];
}

function hasGroupAbove(from: WordHolder | null): boolean {
	for (let node = from; node; node = node.parent) if (node.props["data-surface"] === GROUP) return true;
	return false;
}

function segWordsOf(node: WordHolder): string[] {
	const list = node.parent ? classWordsOf(node.parent.props) : [];
	if (node.type !== "button" || !list.includes("wg-kit-seg")) return [];
	const selected = node.props["aria-selected"];
	return [
		"wg-kit-seg-button",
		...(list.includes("is-s") ? ["wg-kit-seg-button-s"] : []),
		...(selected === true || selected === "true" ? ["wg-kit-seg-button-selected"] : []),
	];
}

function groupItemWordsOf(node: WordHolder): string[] {
	const { parent } = node;
	if (!parent || !isGroupItem(node) || !classWordsOf(parent.props).includes("wg-kit-item-group")) return [];
	const before = parent.children[parent.children.indexOf(node) - 1];
	return before && isGroupItem(before) ? ["wg-kit-group-item", "wg-kit-group-item-next"] : ["wg-kit-group-item"];
}

function isGroupItem(node: WordHolder): boolean {
	return node.props["data-slot"] === "item" && node.props["data-variant"] === "default";
}
