import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { moduleDeclaredIn } from "./module-declared.js";
import type { DeclaredModule } from "./module-declared.js";
import { jsonAt, levelOf } from "./workspace.js";

export interface DomainFile {
	readonly root: string;
	readonly name: string;
	readonly inside: readonly string[];
	readonly folder: string;
}

const DOMAIN_LEVEL = "domain";
const MODULE_FILE = "module.ts";
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
	const parsed = parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["typescript"] });
	return moduleDeclaredIn(parsed.program.body);
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
	const name: unknown = typeof manifest === "object" && manifest !== null ? Reflect.get(manifest, "name") : "";
	return typeof name === "string" ? name : "";
}
