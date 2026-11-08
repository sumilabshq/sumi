import fs from "node:fs";
import path from "node:path";
import type { types } from "@babel/core";
import { isHandWritten, parsedScript, scriptsUnder, textFilesUnder } from "./rename-files.js";
import type { ParsedScript, Resolve } from "./rename-files.js";
import type { RenamePlan } from "./rename-plan.js";

export interface TextMention {
	readonly file: string;
	readonly line: number;
	readonly said: string;
}

const EXPORT_ALL = "export *";

export function candidateScripts(root: string, plan: RenamePlan): ParsedScript[] {
	const needles = needlesOf(plan);
	return scriptsUnder(root).flatMap((file) => {
		const text = fs.readFileSync(file, "utf8");
		const isCandidate = needles.some((needle) => text.includes(needle)) || text.includes(EXPORT_ALL);
		return isCandidate && isHandWritten(text) ? [parsedScript(file, text)] : [];
	});
}

export function sourcesReached(
	scripts: readonly ParsedScript[],
	plan: RenamePlan,
	resolve: Resolve,
): ReadonlySet<string> {
	const reached = new Set(plan.sources);
	let isGrowing = true;

	while (isGrowing) {
		const joined = scripts.filter(
			({ file, ast }) => !reached.has(file) && reExportsFrom(ast.program.body, { file, plan, resolve, reached }),
		);
		joined.forEach(({ file }) => reached.add(file));
		isGrowing = joined.length > 0;
	}

	return reached;
}

export function textMentionsIn(
	root: string,
	plan: RenamePlan,
	scriptTexts: ReadonlyMap<string, string>,
): TextMention[] {
	const needles = mentionNeedlesOf(plan).map((needle) => new RegExp(`${escapedOf(needle)}(?![\\w-])`));
	const texts = new Map([
		...textFilesUnder(root).map((file) => [file, fs.readFileSync(file, "utf8")] as const),
		...scriptTexts,
	]);
	return [...texts].flatMap(([file, text]) =>
		text
			.split("\n")
			.flatMap((said, at) =>
				needles.some((needle) => needle.test(said))
					? [{ file: path.relative(root, file), line: at + 1, said: said.trim() }]
					: [],
			),
	);
}

interface ReExportAsk {
	readonly file: string;
	readonly plan: RenamePlan;
	readonly resolve: Resolve;
	readonly reached: ReadonlySet<string>;
}

function reExportsFrom(body: readonly types.Statement[], { file, plan, resolve, reached }: ReExportAsk): boolean {
	const isReached = (specifier: string): boolean => {
		const resolved = resolve(file, specifier);
		return resolved !== null && reached.has(resolved);
	};
	const importedLocals = new Set(
		body.flatMap((statement) =>
			statement.type === "ImportDeclaration" && isReached(statement.source.value)
				? statement.specifiers.flatMap((specifier) =>
						specifier.type === "ImportSpecifier" && importedNameOf(specifier) === plan.oldName
							? [specifier.local.name]
							: [],
					)
				: [],
		),
	);
	return body.some((statement) => {
		if (statement.type === "ExportAllDeclaration") {
			return isReached(statement.source.value);
		}

		if (statement.type !== "ExportNamedDeclaration") {
			return false;
		}

		const locals = statement.specifiers.flatMap((specifier) =>
			specifier.type === "ExportSpecifier" ? [specifier.local.name] : [],
		);
		return statement.source == null
			? locals.some((local) => importedLocals.has(local))
			: isReached(statement.source.value) && locals.includes(plan.oldName);
	});
}

function importedNameOf({ imported }: types.ImportSpecifier): string {
	return imported.type === "Identifier" ? imported.name : imported.value;
}

function escapedOf(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function needlesOf(plan: RenamePlan): string[] {
	return [plan.oldName, ...plan.strings.keys()];
}

function mentionNeedlesOf(plan: RenamePlan): string[] {
	const { namespace, identity } = plan;
	const chain = namespace === null ? [] : [[namespace.constant, ...namespace.path, plan.oldName].join(".")];
	const call = identity === null ? [] : [`${identity.method}("${identity.from}")`];
	return [...plan.strings.keys(), ...chain, ...call];
}
