import path from "node:path";
import type { Expression, Node, Statement } from "@babel/types";
import { CliRefusal } from "./cli-output.js";
import { importsIn } from "./contract-imports.js";
import type { Imported } from "./contract-imports.js";
import { usesOf } from "./free-names.js";
import { shapeRefsOf } from "./schema-shape.js";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import { parsedSourceOf } from "@widgetarium/eslint-plugin/files";

export interface SchemaFile {
	readonly relative: string;
	readonly text: string;
	readonly body: readonly Statement[];
	readonly imports: readonly Imported[];
}

export interface Declared {
	readonly name: string;
	readonly file: string;
	readonly text: string;
	readonly at: number;
	readonly isExportedType: boolean;
	readonly eager: readonly string[];
	readonly needs: readonly string[];
}

const NOT_A_SHAPE =
	"{file}: {name} is built with {kind}; move it out of the shape: refinements and helpers belong to the handler or the gateway";
const UNREADABLE = "{file} cannot be read: {reason}";

export function isExportedType(statement: Statement): boolean {
	const type = statement.type === "ExportNamedDeclaration" ? statement.declaration?.type : null;
	return type === "TSTypeAliasDeclaration" || type === "TSInterfaceDeclaration";
}

export function declaredNameOf(statement: Statement): string | null {
	const inner = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;

	if (inner?.type === "VariableDeclaration") {
		const [declarator] = inner.declarations;
		return declarator?.id.type === "Identifier" ? declarator.id.name : null;
	}

	const isNamed =
		inner?.type === "TSTypeAliasDeclaration" ||
		inner?.type === "TSInterfaceDeclaration" ||
		inner?.type === "FunctionDeclaration" ||
		inner?.type === "ClassDeclaration";
	return isNamed ? (inner.id?.name ?? null) : null;
}

export function declaredOf(file: SchemaFile, statement: Statement): Declared | null {
	const isExported = statement.type === "ExportNamedDeclaration";
	const inner = isExported ? statement.declaration : statement;

	if (inner == null) {
		return null;
	}

	if (inner.type === "TSTypeAliasDeclaration" || inner.type === "TSInterfaceDeclaration") {
		return typeDeclaredOf(file, statement, inner.id.name, isExported);
	}

	if (inner.type === "FunctionDeclaration" || inner.type === "ClassDeclaration") {
		const kind = inner.type === "FunctionDeclaration" ? "a function" : "a class";
		throw new CliRefusal(fillTemplate(NOT_A_SHAPE, { file: file.relative, name: inner.id?.name ?? kind, kind }));
	}

	return inner.type === "VariableDeclaration" ? constDeclaredOf(file, statement, inner) : null;
}

export function schemaFileOf(folder: string, relative: string): SchemaFile {
	try {
		const parsed = parsedSourceOf(path.join(folder, relative));
		return {
			relative,
			...parsed,
			imports: importsIn(parsed.body),
		};
	} catch (failure: unknown) {
		const reason = failure instanceof Error ? failure.message : String(failure);
		throw new CliRefusal(fillTemplate(UNREADABLE, { file: relative, reason }));
	}
}

function typeDeclaredOf(file: SchemaFile, statement: Statement, name: string, isExported: boolean): Declared {
	return {
		...placeOf(file, statement, name),
		isExportedType: isExported,
		eager: [],
		needs: namesUsedIn(statement, name),
	};
}

function constDeclaredOf(
	file: SchemaFile,
	statement: Statement,
	declaration: Extract<Statement, { type: "VariableDeclaration" }>,
): Declared | null {
	const [declarator] = declaration.declarations;

	if (declarator?.id.type !== "Identifier" || declarator.init == null) {
		return null;
	}

	const { name } = declarator.id;
	const refs = shapeRefsOf(declarator.init, (kind) => {
		throw new CliRefusal(fillTemplate(NOT_A_SHAPE, { file: file.relative, name, kind }));
	});
	const annotation = declarator.id.typeAnnotation;
	return {
		...placeOf(file, statement, name),
		isExportedType: false,
		eager: refs.eager.filter((used) => used !== name),
		needs: [...refs.lazy, ...(annotation == null ? [] : namesUsedIn(annotation, name))],
	};
}

function placeOf(
	file: SchemaFile,
	statement: Statement,
	name: string,
): Pick<Declared, "name" | "file" | "text" | "at"> {
	const at = statement.start ?? 0;
	return {
		name,
		file: file.relative,
		text: file.text.slice(at, statement.end ?? at),
		at,
	};
}

function namesUsedIn(node: Node | Expression, own: string): string[] {
	return [...new Set(usesOf(node, new Set()).map(({ name }) => name))].filter((name) => name !== own);
}
