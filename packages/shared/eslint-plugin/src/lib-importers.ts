import fs from "node:fs";
import path from "node:path";
import type { Statement } from "@babel/types";
import { babelBodyOf, entriesUnder } from "./files.js";

export const EVERY_NAME = "*";

interface Imported {
	readonly from: string;
	readonly names: readonly string[];
}

interface Parsed {
	readonly stamp: number;
	readonly imported: readonly Imported[];
}

const SCRIPT = /\.tsx?$/;
const JS_SPECIFIER = /\.jsx?$/;
const PARSED = new Map<string, Parsed>();

export function importersOf(root: string, target: string): ReadonlyMap<string, ReadonlySet<string>> {
	const byName = new Map<string, Set<string>>();
	for (const file of scriptsUnder(root).filter((one) => one !== target))
		for (const name of namesImportedFrom(file, target)) byName.set(name, (byName.get(name) ?? new Set()).add(file));
	return byName;
}

function namesImportedFrom(file: string, target: string): string[] {
	return importsOf(file)
		.filter(({ from }) => from === target)
		.flatMap(({ names }) => names);
}

function scriptsUnder(root: string): string[] {
	return entriesUnder(root)
		.filter(({ full, isFolder }) => !isFolder && SCRIPT.test(full))
		.map(({ full }) => full);
}

function importsOf(file: string): readonly Imported[] {
	const stamp = fs.statSync(file).mtimeMs;
	const known = PARSED.get(file);
	if (known?.stamp === stamp) return known.imported;
	const imported = importsParsedFrom(file);
	PARSED.set(file, { stamp, imported });
	return imported;
}

function importsParsedFrom(file: string): Imported[] {
	return babelBodyOf(file).flatMap((statement) => importOf(file, statement));
}

function importOf(file: string, statement: Statement): Imported[] {
	const source = "source" in statement ? statement.source : null;
	if (source?.type !== "StringLiteral" || !source.value.startsWith(".")) return [];
	const from = resolvedFrom(file, source.value);
	if (from === null) return [];
	return [{ from, names: namesOf(statement) }];
}

function namesOf(statement: Statement): string[] {
	if (statement.type === "ExportAllDeclaration") return [EVERY_NAME];
	if (statement.type !== "ImportDeclaration" && statement.type !== "ExportNamedDeclaration") return [];
	return statement.specifiers.map((specifier) => {
		if (specifier.type === "ImportNamespaceSpecifier" || specifier.type === "ExportNamespaceSpecifier")
			return EVERY_NAME;
		if (specifier.type === "ImportDefaultSpecifier" || specifier.type === "ExportDefaultSpecifier") return "default";
		const named = specifier.type === "ImportSpecifier" ? specifier.imported : specifier.local;
		return named.type === "Identifier" ? named.name : named.value;
	});
}

function resolvedFrom(file: string, specifier: string): string | null {
	const bare = path.resolve(path.dirname(file), specifier).replace(JS_SPECIFIER, "");
	return [".ts", ".tsx"].map((extension) => bare.replace(SCRIPT, "") + extension).find(fs.existsSync) ?? null;
}
