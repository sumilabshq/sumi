import { readdirSync, readFileSync } from "node:fs";
import { BASE_KIT, type BaseKitEntry } from "../packages/shared/kit/src/constants/base-kit.ts";

const KIT_SRC = new URL("../packages/shared/kit/src/", import.meta.url);

export interface BaseKitGaps {
	readonly missing: readonly string[];
	readonly unmerged: readonly string[];
	readonly unknownToday: readonly string[];
}

export function kitExportNames(): readonly string[] {
	const visited = new Set<string>();
	const roots = ["index.ts", ...readdirSync(KIT_SRC).filter((file) => /^exports-.*\.ts$/.test(file))];
	return [...new Set(roots.flatMap((file) => exportNamesOfFile(file, visited)))];
}

export function baseKitGaps(exported: readonly string[], entries: readonly BaseKitEntry[] = BASE_KIT): BaseKitGaps {
	const names = new Set(exported);
	return {
		missing: entries.filter((entry) => !names.has(entry.name)).map((entry) => entry.name),
		unmerged: entries.flatMap((entry) =>
			entry.today.filter((name) => name !== entry.name && names.has(name)).map((name) => `${name} -> ${entry.name}`),
		),
		unknownToday: entries.flatMap((entry) =>
			entry.today.filter((name) => !names.has(name)).map((name) => `${name} (in ${entry.name})`),
		),
	};
}

function exportNamesOfFile(file: string, visited: Set<string>): readonly string[] {
	if (visited.has(file)) {
		return [];
	}
	visited.add(file);
	const source = readFileSync(new URL(file, KIT_SRC), "utf8");
	return [
		...namesOfExportSource(source),
		...followedFilesOf(source).flatMap((next) => exportNamesOfFile(next, visited)),
	];
}

function namesOfExportSource(source: string): readonly string[] {
	return [...source.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((match) =>
		(match[1] ?? "").split(",").flatMap((specifier) => exportedNameOf(specifier) ?? []),
	);
}

function followedFilesOf(source: string): readonly string[] {
	return [...source.matchAll(/export\s*\*\s*from\s*"\.\/([^"]+)"/g)].map(
		(match) => `${(match[1] ?? "").replace(/\.ts$/, "")}.ts`,
	);
}

function exportedNameOf(specifier: string): string | undefined {
	const trimmed = specifier.trim();
	if (trimmed === "" || trimmed.startsWith("type ")) {
		return undefined;
	}
	return trimmed.split(/\s+as\s+/).pop();
}
