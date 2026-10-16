import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import type { Expression, ImportDeclaration, Node, Statement } from "@babel/types";
import { CliRefusal } from "./cli-output.js";
import type { DeclaredModule } from "@widgetarium/eslint-plugin/module-declared";

export const JOINED_ENTRY = "generated/module.ts";

interface FoundHandler {
	readonly name: string;
	readonly file: string;
}

interface HandlersFile {
	readonly relative: string;
	readonly body: readonly Statement[];
}

const HANDLERS_FILE = "handlers.ts";
const HANDLER_NAME = /Handler$/;
const MODULE_FILE = /^\.\.?\/.*module(\.js|\.ts)?$/;
const SCRIPT = /\.ts$/;
const DEFINITION = "{name}Definition";
const OTHER_MODULE =
	"{file}: {handler} names {named} as its module, but {module} is defined in this folder: a handler takes the module of its own folder";

export function joinedTextOf(folder: string, declared: DeclaredModule, handlersFiles: readonly string[]): string {
	const files = handlersFiles
		.filter((relative) => path.basename(relative) === HANDLERS_FILE)
		.map((relative) => parsedHandlers(folder, relative));
	const found = files.flatMap((file) => handlersIn(file, folder, declared));
	return joinedText(declared, found);
}

function parsedHandlers(folder: string, relative: string): HandlersFile {
	const text = fs.readFileSync(path.join(folder, relative), "utf8");
	return { relative, body: parse(text, { sourceType: "module", plugins: ["typescript"] }).program.body };
}

function handlersIn(file: HandlersFile, folder: string, declared: DeclaredModule): FoundHandler[] {
	return file.body
		.flatMap((statement) => exportedHandlers(statement))
		.map(({ name, init }) => {
			const named = moduleNamedBy(init);
			if (named !== declared.name || !importsDefinition(file, folder, named))
				throw new CliRefusal(otherModule(file.relative, name, named, declared.name));
			return { name, file: file.relative };
		});
}

function exportedHandlers(statement: Statement): { readonly name: string; readonly init: Expression }[] {
	if (statement.type !== "ExportNamedDeclaration" || statement.declaration?.type !== "VariableDeclaration") return [];
	return statement.declaration.declarations.flatMap((declarator) =>
		declarator.id.type === "Identifier" && HANDLER_NAME.test(declarator.id.name) && declarator.init != null
			? [{ name: declarator.id.name, init: declarator.init }]
			: [],
	);
}

function moduleNamedBy(node: Node): string {
	if (node.type === "MemberExpression") return moduleNamedBy(node.object);
	if (node.type !== "CallExpression") return "";
	if (node.callee.type !== "Identifier") return moduleNamedBy(node.callee);
	const [, module] = node.arguments;
	return node.callee.name === "handler" && module?.type === "Identifier" ? module.name : "";
}

function importsDefinition(file: HandlersFile, folder: string, name: string): boolean {
	return file.body.some(
		(statement) =>
			statement.type === "ImportDeclaration" &&
			importsName(statement, name) &&
			isModuleFile(folder, file.relative, statement.source.value),
	);
}

function importsName(statement: ImportDeclaration, name: string): boolean {
	return statement.specifiers.some((specifier) => specifier.local.name === name);
}

function isModuleFile(folder: string, relative: string, specifier: string): boolean {
	if (!MODULE_FILE.test(specifier)) return false;
	const target = path.resolve(path.dirname(path.join(folder, relative)), specifier).replace(/\.(js|ts)$/, "");
	return target === path.join(folder, "module");
}

function joinedText(declared: DeclaredModule, found: readonly FoundHandler[]): string {
	const definition = DEFINITION.replace("{name}", declared.name);
	const listed = found
		.map(({ name }) => name)
		.sort()
		.map((name) => `\t${name},\n`);
	return [
		...handlerImportsOf(found),
		`import { ${declared.name} as ${definition} } from "../module.js";\n`,
		"\n",
		`export const ${declared.name} = ${definition}.handlers([\n${listed.join("")}]);\n`,
	].join("");
}

function handlerImportsOf(found: readonly FoundHandler[]): string[] {
	const byFile = new Map<string, string[]>();
	for (const { name, file } of [...found].sort((one, other) => one.file.localeCompare(other.file)))
		byFile.set(file, [...(byFile.get(file) ?? []), name]);
	return [...byFile].map(
		([file, names]) => `import { ${[...names].sort().join(", ")} } from "../${file.replace(SCRIPT, ".js")}";\n`,
	);
}

function otherModule(file: string, handler: string, named: string, module: string): string {
	return OTHER_MODULE.replace("{file}", file)
		.replace("{handler}", handler)
		.replace("{named}", named || "no module")
		.replace("{module}", module);
}
