import path from "node:path";
import type { Statement } from "@babel/types";
import { CliRefusal } from "./cli-output.js";
import type { Imported } from "./contract-imports.js";
import type { SchemaRoot } from "./contract-schemas.js";
import type { NameUse } from "./free-names.js";
import { exportedConstsOf, rootCallOf } from "@widgetarium/eslint-plugin/babel-chain";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";

export interface SourceFile {
	readonly relative: string;
	readonly text: string;
	readonly body: readonly Statement[];
}

export interface ListedRequest {
	readonly name: string;
	readonly file: SourceFile;
	readonly chain: string;
	readonly uses: readonly NameUse[];
}

export interface RequestImports {
	readonly folder: string;
	readonly request: ListedRequest;
	readonly imports: readonly Imported[];
	readonly listed: ReadonlySet<string>;
}

export type ContractNeed =
	{ readonly kind: "import"; readonly imported: Imported } | { readonly kind: "schema"; readonly root: SchemaRoot };

export const REQUEST_ROOTS: ReadonlySet<string> = new Set(["query", "command"]);
const KNOWN_GLOBALS: ReadonlySet<string> = new Set([
	"undefined",
	"NaN",
	"Infinity",
	"globalThis",
	"Object",
	"Array",
	"String",
	"Number",
	"Boolean",
	"BigInt",
	"Symbol",
	"Date",
	"Math",
	"JSON",
	"RegExp",
	"Error",
	"Promise",
	"Map",
	"Set",
	"URL",
	"Record",
	"Readonly",
	"ReadonlyArray",
	"Partial",
	"Required",
	"Pick",
	"Omit",
	"Exclude",
	"Extract",
	"NonNullable",
	"ReturnType",
	"Parameters",
	"Awaited",
]);
const SCHEMAS = "shared/schema/";
const SCRIPT = /\.[jt]s$/;
const CONTRACT_PACKAGES: ReadonlySet<string> = new Set(["zod", "@widgetarium/core/requests"]);

const DECLARED_BESIDE =
	"{file}: the contract of {name} uses {used}, declared in that file; a contract reads only imports, so move {used} to shared/schema";
const UNLISTED_BESIDE =
	"{file}: the contract of {name} uses {used}, a request of that file that module.ts does not list; list {used} in module.ts";
const NOT_DECLARED = "{file}: the contract of {name} uses {used}, which that file neither imports nor declares";
const NOT_A_SCHEMA =
	"{file}: the contract of {name} uses {used} from {specifier}; a contract imports only shared/schema and packages, so no handler code reaches a client";
const NOT_A_CONTRACT_PACKAGE =
	"{file}: the contract of {name} uses {used} from {specifier}; a contract imports only zod, @widgetarium/core/requests and shared/schema";
const SCHEMA_BY_NAME = "{file}: the contract of {name} uses {used}; import a schema by its own name from shared/schema";

export function needsOfRequest(asked: RequestImports): ContractNeed[] {
	return usedNamesOf(asked.request.uses)
		.filter(({ name }) => !asked.listed.has(name))
		.flatMap((use) => needOfUse(asked, use));
}

export function relativeOf(folder: string, fromRelative: string, specifier: string): string {
	const resolved = path.resolve(path.dirname(path.join(folder, fromRelative)), specifier).replace(SCRIPT, ".ts");
	return path.relative(folder, resolved).split(path.sep).join("/");
}

function usedNamesOf(uses: readonly NameUse[]): NameUse[] {
	const isOnlyType = new Map<string, boolean>();

	for (const { name, isType } of uses) {
		isOnlyType.set(name, (isOnlyType.get(name) ?? true) && isType);
	}

	return [...isOnlyType].map(([name, isType]) => ({
		name,
		isType,
	}));
}

function needOfUse({ folder, request, imports }: RequestImports, use: NameUse): ContractNeed[] {
	const from = imports.find(({ local }) => local === use.name);

	if (from !== undefined) {
		return [
			needForContract(folder, request, {
				...from,
				isType: from.isType || use.isType,
			}),
		];
	}

	refuseDeclaredBeside(request, use.name);

	if (KNOWN_GLOBALS.has(use.name)) {
		return [];
	}

	throw new CliRefusal(fillTemplate(NOT_DECLARED, { file: request.file.relative, name: request.name, used: use.name }));
}

function refuseDeclaredBeside(request: ListedRequest, used: string): void {
	const { body } = request.file;

	if (!isDeclaredIn(body, used)) {
		return;
	}

	const message = isRequestDeclaredIn(body, used) ? UNLISTED_BESIDE : DECLARED_BESIDE;
	throw new CliRefusal(fillTemplate(message, { file: request.file.relative, name: request.name, used }));
}

function needForContract(folder: string, request: ListedRequest, from: Imported): ContractNeed {
	const data = { file: request.file.relative, name: request.name, used: from.local, specifier: from.specifier };

	if (!from.specifier.startsWith(".")) {
		if (!CONTRACT_PACKAGES.has(from.specifier)) {
			throw new CliRefusal(fillTemplate(NOT_A_CONTRACT_PACKAGE, data));
		}

		return { kind: "import", imported: from };
	}

	const target = relativeOf(folder, request.file.relative, from.specifier);

	if (!target.startsWith(SCHEMAS)) {
		throw new CliRefusal(fillTemplate(NOT_A_SCHEMA, data));
	}

	if (from.form !== "named" || from.imported !== from.local) {
		throw new CliRefusal(fillTemplate(SCHEMA_BY_NAME, data));
	}

	return { kind: "schema", root: { name: from.imported, file: target } };
}

function isDeclaredIn(body: readonly Statement[], name: string): boolean {
	return body.some((statement) => {
		const declared = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;

		if (declared?.type === "VariableDeclaration") {
			return declared.declarations.some(
				(declarator) => declarator.id.type === "Identifier" && declarator.id.name === name,
			);
		}

		return (
			(declared?.type === "FunctionDeclaration" || declared?.type === "ClassDeclaration") && declared.id?.name === name
		);
	});
}

function isRequestDeclaredIn(body: readonly Statement[], name: string): boolean {
	return exportedConstsOf(body).some(
		(declared) => declared.name === name && REQUEST_ROOTS.has(rootCallOf(declared.init)?.method ?? ""),
	);
}
