import fs from "node:fs";
import path from "node:path";
import { babelBodyOf } from "./files.js";
import { fieldOf } from "./guards.js";
import { moduleDeclaredIn } from "./module-declared.js";
import type { DeclaredModule } from "./module-declared.js";
import { jsonAt, levelOf } from "./workspace.js";

export interface DomainFile {
	readonly root: string;
	readonly name: string;
	readonly inside: readonly string[];
	readonly folder: string;
}

export const MODULE_FILE = "module.ts";
export const CONTRACT_FILE = "contract.ts";
export const HANDLERS_FILE = "handlers.ts";
export const FEATURES = "features";
export const FEATURE_FILES: readonly string[] = [CONTRACT_FILE, HANDLERS_FILE];

const DOMAIN_LEVEL = "domain";
const ROOTS = new Map<string, DomainRoot | null>();

interface DomainRoot {
	readonly root: string;
	readonly name: string;
}

export function domainFileOf(filename: string): DomainFile | null {
	const owner = domainRootOf(path.dirname(path.resolve(filename)));
	if (owner === null) return null;
	const inside = path.relative(owner.root, path.resolve(filename)).split(path.sep);
	return { ...owner, inside, folder: inside[0] ?? "" };
}

export function moduleOfDomain(root: string): DeclaredModule | null {
	const file = path.join(root, MODULE_FILE);
	if (!fs.existsSync(file)) return null;
	return moduleDeclaredIn(babelBodyOf(file));
}

export function isFeatureFolder(folder: string): boolean {
	return FEATURE_FILES.some((name) => fs.existsSync(path.join(folder, name)));
}

export function featureFolderOf(root: string, inside: readonly string[]): string | null {
	const [head, first = "", second = ""] = inside;
	if (head !== FEATURES) {
		return null;
	}

	const leaf = isFeatureFolder(path.join(root, FEATURES, first)) ? [first] : [first, second];
	return [FEATURES, ...leaf].join("/");
}

function domainRootOf(folder: string): DomainRoot | null {
	const known = ROOTS.get(folder);
	if (known !== undefined) return known;
	const found = domainRootIn(folder);
	ROOTS.set(folder, found);
	return found;
}

function domainRootIn(folder: string): DomainRoot | null {
	const manifest = jsonAt(path.join(folder, "package.json"));
	if (manifest !== null) return levelOf(manifest) === DOMAIN_LEVEL ? { root: folder, name: nameOf(manifest) } : null;
	const parent = path.dirname(folder);
	return parent === folder ? null : domainRootOf(parent);
}

function nameOf(manifest: unknown): string {
	const name = fieldOf(manifest, "name");
	return typeof name === "string" ? name : "";
}
