import { transform } from "sucrase";
import { isPageFolder } from "./node-marks.js";
import { withNodeMarks } from "./source-nodes.js";
import { reachFindingsIn, reachFindingsOfFolder, reachRefusal } from "./widget-reach/reach-scan.js";
import type { Transform } from "sucrase";
import { missingSourceRefusal, modulesIn, sourceFileIn } from "./widget-files.js";
import type { FolderFiles } from "./widget-files.js";

export {
	BUILD_FILE,
	EVERY_SOURCE_FILE,
	JAVASCRIPT_SOURCE_FILES,
	LIB_FILES,
	SHEET_FILES,
	SOURCE_FILES,
	buildFolder,
	builtCodePath,
	builtSheetPath,
	importsScopeLib,
	isWidgetModule,
	javascriptSourceRefusal,
	libFileIn,
	missingSourceRefusal,
	modulesIn,
	sourceFileIn,
	widgetModulesUnder,
} from "./widget-files.js";
export type { FolderFiles, FolderListing } from "./widget-files.js";

export type CompiledModules = Readonly<Record<string, string>>;
export type ResolvedImports = Readonly<Record<string, Readonly<Record<string, string>>>>;

interface LoaderShape {
	readonly resolved: ResolvedImports;
	readonly exported: string;
}

const TYPED_TRANSFORMS: Transform[] = ["typescript", "jsx", "imports"];
const UNTYPED_TRANSFORMS: Transform[] = ["jsx", "imports"];
const REQUIRE_CALL = /\brequire\((["'])([^"']+)\1\)/g;

export function compileWidget(source: string, filePath: string): string {
	const typed = /\.tsx?$/.test(filePath);
	return transform(source, {
		transforms: typed ? TYPED_TRANSFORMS : UNTYPED_TRANSFORMS,
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath,
	}).code;
}

export function compileCheckedWidget(source: string, filePath: string): string {
	const refusal = reachRefusal(reachFindingsIn(source, filePath), filePath);
	if (refusal !== null) {
		throw new Error(refusal);
	}

	return compileWidget(source, filePath);
}

export function compileWidgetFolder(files: FolderFiles, folder: string): string {
	const entry = sourceFileIn(files);
	if (entry === null) throw new Error(missingSourceRefusal(Object.keys(files), folder));
	const modules = modulesIn(files);
	const refusal = reachRefusal(reachFindingsOfFolder(files, modules), folder);
	if (refusal !== null) {
		throw new Error(refusal);
	}

	const sourceToCompile = (name: string): string =>
		isPageFolder(folder) ? withNodeMarks(sourceOf(files, name), name) : sourceOf(files, name);
	if (modules.length <= 1) return compileWidget(sourceToCompile(entry), `${folder}/${entry}`);
	const compiled = Object.fromEntries(
		modules.map((name) => [name, compileWidget(sourceToCompile(name), `${folder}/${name}`)]),
	);
	return loaderProgramOf(compiled, { resolved: {}, exported: `widgetLoad(${JSON.stringify(entry)})` });
}

export function moduleLoaderProgramOf(compiled: CompiledModules, resolved: ResolvedImports): string {
	return loaderProgramOf(compiled, { resolved, exported: "widgetLoad" });
}

export function moduleCandidatesOf(path: string): string[] {
	return [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`];
}

export function requiredIn(compiled: string): string[] {
	return [...new Set([...compiled.matchAll(REQUIRE_CALL)].map((found) => found[2] ?? ""))];
}

function loaderProgramOf(compiled: CompiledModules, { resolved, exported }: LoaderShape): string {
	const modules = Object.entries(compiled).map(
		([name, code]) => `${JSON.stringify(name)}: function (require, module, exports) {\n${code}\n}`,
	);
	return MODULE_LOADER.replace("{exported}", () => exported)
		.replace("{resolved}", () => JSON.stringify(resolved))
		.replace("{modules}", () => modules.join(",\n"));
}

function sourceOf(files: FolderFiles, name: string): string {
	return files[name] ?? "";
}

const MODULE_LOADER = `const widgetModules = {
{modules}
};
const widgetResolutions = {resolved};
const widgetOuterRequire = require;
const widgetLoaded = {};
function widgetResolved(from, spec) {
	const base = from.split("/").slice(0, -1);
	for (const part of spec.split("/")) {
		if (part === "..") base.pop();
		else if (part !== ".") base.push(part);
	}
	const path = base.join("/");
	const found = [path, path + ".ts", path + ".tsx", path + "/index.ts", path + "/index.tsx"].find((name) => name in widgetModules);
	if (!found) throw new Error("cannot import " + JSON.stringify(spec) + " from " + from);
	return found;
}
function widgetRequired(from, spec) {
	const resolved = (widgetResolutions[from] || {})[spec];
	if (resolved !== undefined) return widgetLoad(resolved);
	if (spec.startsWith(".")) return widgetLoad(widgetResolved(from, spec));
	return widgetOuterRequire(spec);
}
function widgetLoad(name) {
	if (widgetLoaded[name]) return widgetLoaded[name].exports;
	const held = { exports: {} };
	widgetLoaded[name] = held;
	widgetModules[name]((spec) => widgetRequired(name, spec), held, held.exports);
	return held.exports;
}
module.exports = {exported};`;
