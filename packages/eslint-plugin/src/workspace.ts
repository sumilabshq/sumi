import fs from "node:fs";
import path from "node:path";
import { fieldOf } from "./guards.js";

export interface WorkspacePackage {
	readonly folder: string;
	readonly name: string;
	readonly level: string;
}

const ANY_FOLDER = "/*";
const DOMAIN_LEVEL = "domain";
const NOT_JSON = "{file} is not plain JSON, so the Widgetarium lint rules cannot read it";

export function domainModulesIn(cwd: string): string[] {
	return workspacePackagesIn(cwd)
		.filter(({ level }) => level === DOMAIN_LEVEL)
		.map(({ folder }) => folder);
}

export function workspacePackagesIn(cwd: string): WorkspacePackage[] {
	return workspacesOf(cwd)
		.flatMap((pattern) => foldersMatching(cwd, pattern))
		.flatMap((folder) => packageIn(cwd, folder))
		.sort((one, other) => (one.folder < other.folder ? -1 : 1));
}

export function levelOf(manifest: unknown): string {
	return stringAt(fieldOf(manifest, "widgetarium"), "level");
}

export function jsonAt(file: string): unknown {
	if (!fs.existsSync(file)) {
		return null;
	}

	try {
		return JSON.parse(fs.readFileSync(file, "utf8"));
	} catch (failure) {
		throw new Error(
			NOT_JSON.replace("{file}", () => file),
			{ cause: failure },
		);
	}
}

function workspacesOf(cwd: string): string[] {
	const workspaces = fieldOf(jsonAt(path.join(cwd, "package.json")), "workspaces");
	const listed = Array.isArray(workspaces) ? workspaces : fieldOf(workspaces, "packages");
	return Array.isArray(listed) ? listed.filter((pattern): pattern is string => typeof pattern === "string") : [];
}

function foldersMatching(cwd: string, pattern: string): string[] {
	if (!pattern.endsWith(ANY_FOLDER)) return [pattern];
	const parent = pattern.slice(0, -ANY_FOLDER.length);
	const absolute = path.join(cwd, parent);
	if (!fs.existsSync(absolute)) return [];
	return fs
		.readdirSync(absolute, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => `${parent}/${entry.name}`);
}

function packageIn(cwd: string, folder: string): WorkspacePackage[] {
	const manifest = jsonAt(path.join(cwd, folder, "package.json"));
	if (manifest === null) return [];
	return [{ folder, name: stringAt(manifest, "name"), level: levelOf(manifest) }];
}

function stringAt(value: unknown, key: string): string {
	const field = fieldOf(value, key);
	return typeof field === "string" ? field : "";
}
