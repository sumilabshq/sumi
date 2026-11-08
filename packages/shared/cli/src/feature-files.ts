import path from "node:path";
import type { PlannedFile } from "./add-plan.js";
import { MODULE_SPECIFIER } from "./contract-needs.js";
import { FRAMEWORK, camelOf, jsSpecifierOf, kebabOf, pascalOf } from "./scaffold-names.js";

export interface FeatureSeed {
	readonly feature: string;
	readonly query: string | null;
	readonly command: string | null;
}

export interface FeatureNames {
	readonly key: string;
	readonly record: string;
	readonly schema: string;
	readonly gateway: string;
	readonly memoryGateway: string;
	readonly save: string;
	readonly gatewayFile: string;
	readonly memoryFile: string;
	readonly schemaFile: string;
	readonly requestsFile: string;
}

const INPUT_SUFFIX = "InputSchema";

export function featureNamesOf(feature: string): FeatureNames {
	const record = pascalOf(feature);
	return {
		key: camelOf(feature),
		record,
		schema: `${record}Schema`,
		gateway: `${record}Gateway`,
		memoryGateway: `Memory${record}Gateway`,
		save: `save${record}`,
		gatewayFile: `gateways/${feature}/${feature}.gateway.ts`,
		memoryFile: `gateways/${feature}/memory.gateway.ts`,
		schemaFile: `shared/schema/${feature}.schema.ts`,
		requestsFile: `features/${feature}/requests.ts`,
	};
}

export function requestNamesOf({ query, command }: FeatureSeed): string[] {
	return [query, command].filter((name): name is string => name !== null);
}

export function featureFilesOf(seed: FeatureSeed): PlannedFile[] {
	const names = featureNamesOf(seed.feature);
	return [
		{ at: names.schemaFile, text: schemaTextOf(seed, names) },
		{ at: names.gatewayFile, text: gatewayTextOf(seed, names) },
		{ at: names.memoryFile, text: memoryTextOf(seed, names) },
		{ at: names.requestsFile, text: requestsTextOf(seed, names) },
	];
}

export function gatewayBindingOf(key: string): string {
	return `${key}Gateway`;
}

export function inputSchemaOf(command: string): string {
	return `${pascalOf(kebabOf(command))}${INPUT_SUFFIX}`;
}

function heldKeyOf(seed: FeatureSeed, { key }: FeatureNames): string {
	return seed.query === key ? gatewayBindingOf(key) : key;
}

function relativeJs(file: string): string {
	return `../../${jsSpecifierOf(file)}`;
}

function schemaTextOf({ command }: FeatureSeed, { record, schema }: FeatureNames): string {
	const input =
		command === null
			? []
			: ["", `export const ${inputSchemaOf(command)} = z.object({`, "\tname: z.string().min(1),", "});"];
	return [
		'import { z } from "zod";',
		"",
		`export const ${schema} = z.object({`,
		"\tnames: z.array(z.string()),",
		"});",
		"",
		`export type ${record} = z.infer<typeof ${schema}>;`,
		...input,
		"",
	].join("\n");
}

function gatewayTextOf({ command }: FeatureSeed, names: FeatureNames): string {
	const save =
		command === null ? [] : [`\tabstract ${names.save}(${names.key}: ${names.record}, reason: string): void;`];
	return [
		`import type { ${names.record} } from "${relativeJs(names.schemaFile)}";`,
		"",
		`export abstract class ${names.gateway} {`,
		`\tabstract ${names.key}(): ${names.record};`,
		...save,
		"}",
		"",
	].join("\n");
}

function memoryTextOf({ command }: FeatureSeed, names: FeatureNames): string {
	const isWritten = command !== null;
	const save = isWritten
		? ["", `\toverride ${names.save}(${names.key}: ${names.record}): void {`, `\t\tthis.held = ${names.key};`, "\t}"]
		: [];
	return [
		`import type { ${names.record} } from "${relativeJs(names.schemaFile)}";`,
		`import { ${names.gateway} } from "./${path.posix.basename(names.gatewayFile, ".ts")}.js";`,
		"",
		`export class ${names.memoryGateway} extends ${names.gateway} {`,
		`\tconstructor(private ${isWritten ? "" : "readonly "}held: ${names.record}) {`,
		"\t\tsuper();",
		"\t}",
		"",
		`\toverride ${names.key}(): ${names.record} {`,
		"\t\treturn this.held;",
		"\t}",
		...save,
		"}",
		"",
	].join("\n");
}

function requestsTextOf(seed: FeatureSeed, names: FeatureNames): string {
	const builders = [...(seed.command === null ? [] : ["command"]), ...(seed.query === null ? [] : ["query"])];
	const schemas = [names.schema, ...(seed.command === null ? [] : [inputSchemaOf(seed.command)])].sort();
	return [
		...(seed.command === null ? [] : [`import { PerCall } from "${FRAMEWORK}";`]),
		`import { ${builders.join(", ")} } from "${MODULE_SPECIFIER}";`,
		`import { ${schemas.join(", ")} } from "${relativeJs(names.schemaFile)}";`,
		...(seed.query === null ? [] : ["", ...queryLinesOf(seed, seed.query, names)]),
		...(seed.command === null ? [] : ["", ...commandLinesOf(seed, seed.command, names)]),
		"",
	].join("\n");
}

function queryLinesOf(seed: FeatureSeed, query: string, names: FeatureNames): string[] {
	const held = heldKeyOf(seed, names);
	return [
		`export const ${query} = query()`,
		"\t.public()",
		`\t.output(${names.schema})`,
		`\t.handle((_input, { ${bindingOf(names.key, held)} }) => ${held}.${names.key}());`,
	];
}

function bindingOf(key: string, held: string): string {
	return key === held ? key : `${key}: ${held}`;
}

function commandLinesOf(seed: FeatureSeed, command: string, names: FeatureNames): string[] {
	const { key, schema, save } = names;
	const held = heldKeyOf(seed, names);
	const shortName = kebabOf(command);
	const context = seed.query === null ? bindingOf(key, held) : `${bindingOf(key, held)}, invalidate`;
	return [
		`export const ${command} = command()`,
		"\t.public()",
		`\t.input(${inputSchemaOf(command)})`,
		`\t.output(${schema})`,
		"\t.idempotencyKey(PerCall)",
		`\t.handle(({ name }, { ${context} }) => {`,
		...(seed.query === null ? [] : [`\t\tinvalidate(${seed.query});`]),
		`\t\tconst was = ${held}.${key}();`,
		"\t\tconst now = {",
		"\t\t\t...was,",
		"\t\t\tnames: [...was.names, name],",
		"\t\t};",
		`\t\tconst reason = \`${key} \${was.names.length} → \${now.names.length} (${shortName} \${name})\`;`,
		`\t\t${held}.${save}(now, reason);`,
		"\t\tconsole.info(`[widgetarium] ${reason}`);",
		"\t\treturn now;",
		"\t});",
	];
}
