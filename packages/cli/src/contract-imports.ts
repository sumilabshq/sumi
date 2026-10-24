import type { ImportDeclaration, Statement } from "@babel/types";
import { CliRefusal } from "./cli-output.js";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";

type ImportForm = "named" | "default" | "namespace";

export interface Imported {
	readonly specifier: string;
	readonly imported: string;
	readonly local: string;
	readonly form: ImportForm;
	readonly isType: boolean;
}

interface ImportLine {
	readonly specifier: string;
	readonly line: string;
}

const TWO_IMPORTS = "the contracts bind {local} to two imports, {one} and {other}; import it under one name";

export function withoutRepeats(imports: readonly Imported[]): Imported[] {
	const byLocal = new Map<string, Imported>();

	for (const one of imports) {
		const held = byLocal.get(one.local);
		byLocal.set(one.local, held === undefined ? one : sameImportOf(held, one));
	}

	return [...byLocal.values()];
}

export function importLinesOf(imports: readonly Imported[]): string {
	const named = namedImportLinesOf(imports.filter(({ form }) => form === "named"));
	const whole = imports.filter(({ form }) => form !== "named").map(wholeImportLineOf);
	return [...named, ...whole]
		.sort((one, other) => one.specifier.localeCompare(other.specifier) || one.line.localeCompare(other.line))
		.map(({ line }) => line)
		.join("");
}

export function importsIn(body: readonly Statement[]): Imported[] {
	return body
		.filter((statement): statement is ImportDeclaration => statement.type === "ImportDeclaration")
		.flatMap((statement) => statement.specifiers.map((specifier) => importedBy(statement, specifier)));
}

function sameImportOf(held: Imported, other: Imported): Imported {
	if (held.specifier !== other.specifier || held.imported !== other.imported || held.form !== other.form) {
		const data = { local: held.local, one: importWords(held), other: importWords(other) };
		throw new CliRefusal(fillTemplate(TWO_IMPORTS, data));
	}

	return {
		...held,
		isType: held.isType && other.isType,
	};
}

function importWords({ imported, specifier }: Imported): string {
	return `${imported} from "${specifier}"`;
}

function namedImportLinesOf(imports: readonly Imported[]): ImportLine[] {
	const groups = new Map<string, Imported[]>();

	for (const one of imports) {
		const key = `${typeWordOf(one)}${one.specifier}`;
		groups.set(key, [...(groups.get(key) ?? []), one]);
	}

	return [...groups.values()].flatMap(namedImportLineOf);
}

function namedImportLineOf(group: readonly Imported[]): ImportLine[] {
	const [first] = group;

	if (first === undefined) {
		return [];
	}

	const names = group.map(({ imported, local }) => (imported === local ? local : `${imported} as ${local}`)).sort();
	return [
		{
			specifier: first.specifier,
			line: `import ${typeWordOf(first)}{ ${names.join(", ")} } from "${first.specifier}";\n`,
		},
	];
}

function wholeImportLineOf(one: Imported): ImportLine {
	const binding = one.form === "namespace" ? `* as ${one.local}` : one.local;
	return {
		specifier: one.specifier,
		line: `import ${typeWordOf(one)}${binding} from "${one.specifier}";\n`,
	};
}

function typeWordOf({ isType }: Imported): string {
	return isType ? "type " : "";
}

function importedBy(statement: ImportDeclaration, specifier: ImportDeclaration["specifiers"][number]): Imported {
	const isType = statement.importKind === "type";
	const local = specifier.local.name;
	const from = statement.source.value;

	if (specifier.type === "ImportDefaultSpecifier") {
		return { specifier: from, imported: "default", local, form: "default", isType };
	}

	if (specifier.type === "ImportNamespaceSpecifier") {
		return { specifier: from, imported: "*", local, form: "namespace", isType };
	}

	return {
		specifier: from,
		imported: specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value,
		local,
		form: "named",
		isType: isType || specifier.importKind === "type",
	};
}
