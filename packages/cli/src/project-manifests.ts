import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { writeFile } from "./template-files.js";

const PACKAGE_MANIFEST = "package.json";
const JsonObjectSchema = z.record(z.string(), z.unknown());
const DependenciesSchema = z.record(z.string(), z.string());

export interface DependencyOutcome {
	readonly name: string;
	readonly range: string;
	readonly held: string | null;
}

export function addMissingDependencies(target: string, wanted: Readonly<Record<string, string>>): DependencyOutcome[] {
	const at = path.join(target, PACKAGE_MANIFEST);
	const manifest = jsonObjectAt(at);
	const dependencies = DependenciesSchema.parse(manifest["dependencies"] ?? {});
	const outcomes = Object.entries(wanted).map(([name, range]) => ({ name, range, held: dependencies[name] ?? null }));
	const added = outcomes.filter(({ held }) => held === null).map(({ name, range }) => [name, range]);
	if (added.length > 0)
		writeJson(at, { ...manifest, dependencies: sortedByKey({ ...dependencies, ...Object.fromEntries(added) }) });
	return outcomes;
}

function jsonObjectAt(at: string): Record<string, unknown> {
	const json: unknown = JSON.parse(fs.readFileSync(at, "utf8"));
	return JsonObjectSchema.parse(json);
}

function writeJson(at: string, value: object): void {
	writeFile(at, `${JSON.stringify(value, null, "\t")}\n`);
}

function sortedByKey(record: Readonly<Record<string, string>>): Record<string, string> {
	return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}
