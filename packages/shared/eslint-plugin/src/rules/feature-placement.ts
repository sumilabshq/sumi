import fs from "node:fs";
import path from "node:path";
import { FEATURE_FILES, LEAF_FILES, REQUESTS_FILE, isFeatureFolder, packageKindOf } from "../domain-file.js";
import type { DomainFile } from "../domain-file.js";
import { fillTemplate } from "../fill-template.js";

const TOP_FILES = /^(module\.ts|index\.ts|package\.json|tsconfig(\.[\w-]+)?\.json|LICENSE|README\.md|[\w-]+\.css)$/;
const ROOT_ENTRY = "index.ts";
const TOP_FOLDERS: ReadonlySet<string> = new Set([
	"features",
	"shared",
	"gateways",
	"generated",
	"node_modules",
	"dist",
]);
const FEATURE_PARTS: ReadonlySet<string> = new Set(["ui", "lib"]);
const SHARED_SCHEMA = /^shared\/schema\/[\w-]+\.schema\.ts$/;
const SHARED_UI = /^shared\/ui\/(index\.ts|.+\.tsx)$/;
const SHARED_LIB = /^shared\/lib\//;
const SHARED_EVENTS = /^shared\/events\/[\w-]+\.events\.ts$/;
const SHARED_HOST = /^shared\/host\/[\w-]+\.host\.ts$/;

const NOT_AT_TOP =
	"{name} does not belong at the top of a module: it holds module.ts, features/, shared/, gateways/ and generated/";
const NOT_A_FEATURE_FILE =
	"a feature holds requests.ts, or contract.ts and handlers.ts, with ui/ and lib/; move {file} into one of them, or to shared/";
const BOTH_STYLES =
	"{feature} holds requests.ts and {old}: a request handles itself in requests.ts, so contract.ts and handlers.ts go";
const VIEW_IN_DATA =
	"a module(...) holds data and its logic, never a view: move {file} to the client package that draws it";
const FEATURE_TOO_DEEP = "features/ nests two levels at most: features/<feature>/ or features/<group>/<feature>/";
const LEAF_MISSING = "{feature} is a feature: it holds contract.ts and handlers.ts, and {missing} is missing";
const GROUP_WITH_FILES = "features/{group}/ is a group of features: it holds only folders, never {files}";
const UI_NOT_TSX = "ui/ holds only .tsx blocks: move {file} to lib/";
const NOT_SHARED =
	"shared/ holds ui/ (.tsx and ui/index.ts), lib/, schema/ (*.schema.ts), events/ (*.events.ts) and host/ (*.host.ts); {file} is none of them";
const NOT_A_GATEWAY =
	"gateways/<gateway>/ holds <gateway>.gateway.ts, one <platform>.gateway.ts per platform and <gateway>.events.ts for the events the gateway is the source of; a many-file implementation goes in gateways/<gateway>/<platform>/";
const NO_IMPLEMENTATION_ENTRY =
	"gateways/<gateway>/{folder}/ has no {folder}.gateway.ts, the one file outside it may import";

export function placementOf(file: DomainFile): string[] {
	const relative = file.inside.join("/");
	if (relative === ROOT_ENTRY) {
		return [];
	}

	if (file.inside.length === 1)
		return relative === "module.ts" ? strayEntriesIn(file.root) : [fillTemplate(NOT_AT_TOP, { name: relative })];
	if (isViewInDataModule(file)) return [fillTemplate(VIEW_IN_DATA, { file: relative })];
	if (file.folder === "features") return featurePlacement(file);
	if (file.folder === "shared") return isShared(relative) ? [] : [fillTemplate(NOT_SHARED, { file: relative })];
	if (file.folder === "gateways") return gatewayPlacement(file);
	return file.folder === "generated" ? [] : [fillTemplate(NOT_AT_TOP, { name: `${file.folder}/` })];
}

function strayEntriesIn(root: string): string[] {
	return fs
		.readdirSync(root, { withFileTypes: true })
		.filter((entry) => !entry.name.startsWith("."))
		.filter((entry) => (entry.isDirectory() ? !TOP_FOLDERS.has(entry.name) : !TOP_FILES.test(entry.name)))
		.map((entry) => fillTemplate(NOT_AT_TOP, { name: entry.isDirectory() ? `${entry.name}/` : entry.name }));
}

function featurePlacement(file: DomainFile): string[] {
	const [, first = "", second = ""] = file.inside;
	const isGrouped = !isFeatureFolder(path.join(file.root, "features", first));
	const featureDepth = isGrouped ? 3 : 2;
	if (isGrouped && file.inside.length > 3 && !isFeatureFolder(path.join(file.root, "features", first, second)))
		return [FEATURE_TOO_DEEP];
	const feature = file.inside.slice(0, featureDepth).join("/");
	const rest = file.inside.slice(featureDepth);
	const grouped = isGrouped ? groupFindings(file.root, first) : [];
	return [...grouped, ...insideFeature(file.root, feature, rest)];
}

function insideFeature(root: string, feature: string, rest: readonly string[]): string[] {
	const [head = "", ...tail] = rest;
	if (tail.length === 0)
		return LEAF_FILES.includes(head) ? leafFindings(root, feature) : [fillTemplate(NOT_A_FEATURE_FILE, { file: head })];
	if (!FEATURE_PARTS.has(head)) return [fillTemplate(NOT_A_FEATURE_FILE, { file: rest.join("/") })];
	const name = tail.at(-1) ?? "";
	return head === "ui" && !name.endsWith(".tsx") ? [fillTemplate(UI_NOT_TSX, { file: name })] : [];
}

function leafFindings(root: string, feature: string): string[] {
	if (fs.existsSync(path.join(root, feature, REQUESTS_FILE))) {
		const old = FEATURE_FILES.filter((name) => fs.existsSync(path.join(root, feature, name)));
		return old.length === 0 ? [] : [fillTemplate(BOTH_STYLES, { feature: `${feature}/`, old: old.join(", ") })];
	}

	const missing = FEATURE_FILES.filter((name) => !fs.existsSync(path.join(root, feature, name)));
	return missing.length === 0
		? []
		: [fillTemplate(LEAF_MISSING, { feature: `${feature}/`, missing: missing.join(", ") })];
}

function groupFindings(root: string, group: string): string[] {
	const files = fs
		.readdirSync(path.join(root, "features", group), { withFileTypes: true })
		.filter((entry) => !entry.isDirectory())
		.map((entry) => entry.name);
	return files.length === 0 ? [] : [fillTemplate(GROUP_WITH_FILES, { group, files: files.join(", ") })];
}

function gatewayPlacement(file: DomainFile): string[] {
	const [, gateway = "", folder = ""] = file.inside;
	if (file.inside.length === 3) {
		return folder.endsWith(".gateway.ts") || folder === `${gateway}.events.ts` ? [] : [NOT_A_GATEWAY];
	}
	if (fs.existsSync(path.join(file.root, "gateways", gateway, folder, `${folder}.gateway.ts`))) return [];
	return [fillTemplate(NO_IMPLEMENTATION_ENTRY, { folder })];
}

function isViewInDataModule(file: DomainFile): boolean {
	const isView = file.inside.includes("ui") || file.inside.at(-1)?.endsWith(".tsx") === true;
	const owner = packageKindOf(file.root);
	return isView && owner?.kind === "module" && owner.module.runs === "anywhere";
}

function isShared(relative: string): boolean {
	return (
		SHARED_SCHEMA.test(relative) ||
		SHARED_UI.test(relative) ||
		SHARED_LIB.test(relative) ||
		SHARED_EVENTS.test(relative) ||
		SHARED_HOST.test(relative)
	);
}
