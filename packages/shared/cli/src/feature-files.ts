import path from "node:path";
import type { PlannedFile } from "./add-plan.js";
import {
	COMMAND_SUFFIX,
	CORE_REQUESTS,
	QUERY_SUFFIX,
	camelOf,
	jsSpecifierOf,
	kebabOf,
	pascalOf,
} from "./scaffold-names.js";

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

export function shortNameOf(request: string, suffix: string): string {
	return kebabOf(request.slice(0, -suffix.length));
}

export function inputSchemaOf(command: string): string {
	return `${command.slice(0, -COMMAND_SUFFIX.length)}${INPUT_SUFFIX}`;
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
	const imported = [
		...(seed.query === null ? [] : ["query"]),
		...(seed.command === null ? [] : ["PerCall", "command"]),
	];
	const schemas = [names.schema, ...(seed.command === null ? [] : [inputSchemaOf(seed.command)])].sort();
	return [
		`import { ${imported.sort().join(", ")} } from "${CORE_REQUESTS}";`,
		`import { ${names.gateway} } from "${relativeJs(names.gatewayFile)}";`,
		`import { ${schemas.join(", ")} } from "${relativeJs(names.schemaFile)}";`,
		...(seed.query === null ? [] : ["", ...queryLinesOf(seed.query, names)]),
		...(seed.command === null ? [] : ["", ...commandLinesOf(seed, seed.command, names)]),
		"",
	].join("\n");
}

function queryLinesOf(query: string, { key, schema, gateway }: FeatureNames): string[] {
	return [
		`export const ${query} = query("${shortNameOf(query, QUERY_SUFFIX)}")`,
		`\t.output(${schema})`,
		`\t.inject({ ${key}: ${gateway} })`,
		`\t.handle((_input, { ${key} }) => ${key}.${key}());`,
	];
}

function commandLinesOf(
	{ query }: FeatureSeed,
	command: string,
	{ key, schema, gateway, save }: FeatureNames,
): string[] {
	const shortName = shortNameOf(command, COMMAND_SUFFIX);
	const context = query === null ? key : `${key}, invalidate`;
	return [
		`export const ${command} = command("${shortName}")`,
		`\t.input(${inputSchemaOf(command)})`,
		`\t.output(${schema})`,
		"\t.idempotencyKey(PerCall)",
		`\t.inject({ ${key}: ${gateway} })`,
		`\t.handle(({ name }, { ${context} }) => {`,
		...(query === null ? [] : [`\t\tinvalidate(${query});`]),
		`\t\tconst was = ${key}.${key}();`,
		"\t\tconst now = {",
		"\t\t\t...was,",
		"\t\t\tnames: [...was.names, name],",
		"\t\t};",
		`\t\tconst reason = \`${key} \${was.names.length} → \${now.names.length} (${shortName} \${name})\`;`,
		`\t\t${key}.${save}(now, reason);`,
		"\t\tconsole.info(`[widgetarium] ${reason}`);",
		"\t\treturn now;",
		"\t});",
	];
}
