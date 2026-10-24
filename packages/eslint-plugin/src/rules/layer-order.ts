import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { FEATURES, HANDLERS_FILE, MODULE_FILE, REQUESTS_FILE, domainFileOf } from "../domain-file.js";
import type { DomainFile } from "../domain-file.js";
import { importListener } from "../imports.js";

type Layer = "shared" | "gateways" | "features" | "module.ts";

const FOLDER_LAYERS: ReadonlySet<string> = new Set(["shared", "gateways", FEATURES]);
const IMPORTS: Readonly<Record<Layer, readonly Layer[]>> = {
	shared: ["shared"],
	gateways: ["shared", "gateways"],
	features: ["shared", "gateways", "features"],
	"module.ts": ["shared", "gateways"],
};

export const layerOrder: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: { description: "a module's layers import one way: shared → gateways → features → module.ts" },
		schema: [],
		messages: {
			upward:
				"{{layer}} imports only {{allowed}}; {{specifier}} is in {{target}}. The order is shared → gateways → features → module.ts",
		},
	},
	create(context) {
		const file = domainFileOf(context.filename);
		const importer = file === null ? null : layerAt(file.inside);
		if (file === null || importer === null) return {};
		return importListener((node, specifier) => checkImport(context, { file, importer, node, specifier }));
	},
};

interface Importing {
	readonly file: DomainFile;
	readonly importer: Layer;
	readonly node: ESTree.Node;
	readonly specifier: string;
}

function checkImport(context: Rule.RuleContext, { file, importer, node, specifier }: Importing): void {
	if (!specifier.startsWith(".")) return;
	const inside = insideOf(file.root, path.resolve(path.dirname(context.filename), specifier));
	const target = layerAt(inside);
	if (target === null) return;
	const allowed = IMPORTS[importer];
	if (allowed.includes(target) || isHandlerBinding(file, target) || isRequestsListing(importer, inside)) {
		return;
	}

	context.report({
		node,
		messageId: "upward",
		data: { layer: importer, allowed: allowed.join(", "), specifier, target },
	});
}

function isHandlerBinding(file: DomainFile, target: Layer): boolean {
	return file.folder === FEATURES && file.inside.at(-1) === HANDLERS_FILE && target === MODULE_FILE;
}

function isRequestsListing(importer: Layer, inside: readonly string[]): boolean {
	return (
		importer === MODULE_FILE && inside[0] === FEATURES && inside.at(-1)?.replace(/\.[jt]s$/, ".ts") === REQUESTS_FILE
	);
}

function insideOf(root: string, file: string): readonly string[] {
	return path.relative(root, file).split(path.sep);
}

function layerAt(inside: readonly string[]): Layer | null {
	const [head = ""] = inside;
	if (inside.length === 1) {
		return head.replace(/\.[jt]sx?$/, ".ts") === MODULE_FILE ? MODULE_FILE : null;
	}

	return isFolderLayer(head) ? head : null;
}

function isFolderLayer(folder: string): folder is Exclude<Layer, typeof MODULE_FILE> {
	return FOLDER_LAYERS.has(folder);
}
