import type { PlannedFile } from "./add-plan.js";
import { MODULE_SPECIFIER } from "./contract-needs.js";
import { COMMAND_ENTRY, HANDLED_ENTRY } from "./module-entry.js";
import { FRAMEWORK, camelOf, jsSpecifierOf, pascalOf } from "./scaffold-names.js";

export type ModulePlacement = "Server" | "Device" | "Anywhere";

export interface ModuleSeed {
	readonly name: string;
	readonly placement: ModulePlacement;
	readonly versions: PackageVersions;
	readonly license: ModuleLicense | null;
}

export interface PackageVersions {
	readonly framework: string;
	readonly zod: string;
}

export interface ModuleLicense {
	readonly id: string;
	readonly text: string;
}

const SERVER_GUARD = "AuthenticatedGuard";

export function moduleFilesOf(seed: ModuleSeed): PlannedFile[] {
	const license = seed.license === null ? [] : [{ at: "LICENSE", text: seed.license.text }];
	return [
		{ at: "package.json", text: manifestOf(seed) },
		{ at: "tsconfig.json", text: tsconfigOf(seed.name) },
		...license,
		{ at: "module.ts", text: moduleTextOf(seed) },
		{ at: pickerPathOf(seed.name), text: pickerTextOf(seed.name) },
	];
}

export function pickerPathOf(module: string): string {
	return `gateways/${module}-parts/${module}-parts.gateway.ts`;
}

export function partsTypeOf(module: string): string {
	return `${pascalOf(module)}Parts`;
}

export function memoryPartsOf(module: string): string {
	return `memory${pascalOf(module)}Parts`;
}

export function moduleConstOf(module: string): string {
	return `${pascalOf(module)}Module`;
}

function entryOf(file: string): Readonly<Record<string, string>> {
	return {
		source: `./${file}.ts`,
		types: `./dist/${file}.d.ts`,
		default: `./dist/${file}.js`,
	};
}

function scriptOf(file: string): string {
	return file.replace(/\.ts$/, "");
}

function manifestOf({ name, placement, versions, license }: ModuleSeed): string {
	const runnable = placement === "Server" ? { server: "./module.ts" } : entryOf("module");
	const manifest = {
		name: `@widgetarium/${name}`,
		version: versions.framework,
		...(license === null ? {} : { license: license.id }),
		type: "module",
		files: ["dist"],
		exports: {
			".": entryOf("index"),
			"./module": runnable,
		},
		imports: { [MODULE_SPECIFIER]: entryOf(scriptOf(COMMAND_ENTRY)) },
		dependencies: { "@widgetarium/data-framework": versions.framework },
		peerDependencies: { zod: versions.zod },
		widgetarium: { level: "domain" },
		sideEffects: false,
	};
	return `${JSON.stringify(manifest, null, "\t")}\n`;
}

function tsconfigOf(name: string): string {
	const tsconfig = {
		compilerOptions: {
			target: "ES2020",
			module: "ESNext",
			moduleResolution: "bundler",
			customConditions: ["source"],
			lib: ["ES2022", "DOM", "DOM.Iterable"],
			strict: true,
			noUnusedLocals: true,
			noUnusedParameters: true,
			noImplicitReturns: true,
			noFallthroughCasesInSwitch: true,
			exactOptionalPropertyTypes: true,
			noUncheckedIndexedAccess: true,
			noImplicitOverride: true,
			noEmit: true,
			tsBuildInfoFile: `../../../node_modules/.cache/widgetarium/${name}.tsbuildinfo`,
			isolatedModules: true,
			verbatimModuleSyntax: true,
			skipLibCheck: true,
			types: [],
		},
		references: [{ path: "../../shared/data-framework" }],
		include: [
			"*.ts",
			"gateways/**/*.ts",
			"features/**/*.ts",
			"shared/**/*.ts",
			"generated/**/*.ts",
			"../../shared/core/src/*.d.ts",
		],
	};
	return `${JSON.stringify(tsconfig, null, "\t")}\n`;
}

function moduleTextOf({ name, placement }: ModuleSeed): string {
	const isServer = placement === "Server";
	const imported = [placement, "module", ...(isServer ? [SERVER_GUARD] : [])].sort();
	return [
		`import { ${imported.join(", ")} } from "${FRAMEWORK}";`,
		`import { ${camelOf(name)}PartsOn } from "./${jsSpecifierOf(pickerPathOf(name))}";`,
		`import { handled } from "./${jsSpecifierOf(HANDLED_ENTRY)}";`,
		"",
		`export const ${moduleConstOf(name)} = module("${name}")`,
		`\t.on(${placement})`,
		...(isServer ? [`\t.guard(${SERVER_GUARD})`] : []),
		`\t.provide((facts) => ${camelOf(name)}PartsOn(facts))`,
		"\t.handles(...handled);",
		"",
	].join("\n");
}

function pickerTextOf(name: string): string {
	const parts = partsTypeOf(name);
	const memory = memoryPartsOf(name);
	return [
		`import type { ModuleFacts, Platform } from "${FRAMEWORK}";`,
		"",
		`export type ${parts} = {};`,
		"",
		`const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => ${parts}>> = {`,
		`\tbrowser: ${memory},`,
		`\ttauri: ${memory},`,
		`\tserver: ${memory},`,
		"};",
		"",
		`export function ${camelOf(name)}PartsOn(facts: ModuleFacts): ${parts} {`,
		"\treturn PARTS_ON[facts.platform](facts);",
		"}",
		"",
		`export function ${memory}(): ${parts} {`,
		"\treturn {};",
		"}",
		"",
	].join("\n");
}
