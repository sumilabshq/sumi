import { z } from "zod";
import { tsconfigPathsOf } from "./project-aliases.js";
import { PROJECT_CONFIG_FILE, ProjectConfigSchema, readProjectConfig, type ProjectConfig } from "./project-config.js";
import { EMPTY_LISTING, type ProjectFiles } from "./project-files.js";
import type { DesignSystemSeed, ProjectSeed } from "./project-seed.js";
import type { ProjectWriter } from "./project-writer.js";

export interface ProjectToLay {
	readonly name: string;
	readonly system: string;
	readonly seed: ProjectSeed;
}

export const CONFIG_SCHEMA_URL = "./node_modules/@widgetarium/cli/widgetarium.schema.json";
export const HANDBOOK_FOLDER = "widgetarium";
export const SYSTEM_DOCS_FOLDER = "design-system";
export const SYSTEM_USAGE_FILE = "USAGE.md";
export const SYSTEM_DESIGN_FILE = "DESIGN.md";
export const VENDOR_FOLDER = "vendor/engine";

const PLACEHOLDER = /\{([a-z][a-z.]*)\}/g;
const NOT_IN_PACKAGE_NAME = /[^a-z0-9._-]+/g;
const EDGE_DASHES = /^[-._]+|-+$/g;
const UNNAMED_PACKAGE = "app";
const LEGACY_NAME_KEY = "name";
const PACKAGE_MANIFEST = "package.json";
const TSCONFIG = "tsconfig.json";
const JsonObjectSchema = z.record(z.string(), z.unknown());
const DependenciesSchema = z.record(z.string(), z.string());

type TemplateValues = Readonly<Record<string, string>>;

export async function layProject(writer: ProjectWriter, project: ProjectToLay): Promise<void> {
	const files = await projectFilesOf(project);
	for (const [path, text] of files) {
		await writer.write(path, text);
	}
}

export async function projectFilesOf({ name, system, seed }: ProjectToLay): Promise<Map<string, string>> {
	const chosen = systemSeedOf(seed, system);
	const configText = projectConfigTextOf(name, system, seed.kitEntries);
	const config = await configOf(configText);
	const files: [string, string][] = [
		[PROJECT_CONFIG_FILE, configText],
		...seededFilesOf(config, seed),
		...systemFilesOf(config, chosen),
	];
	return new Map(files.sort(([left], [right]) => left.localeCompare(right)));
}

export function systemFilesOf(config: ProjectConfig, chosen: DesignSystemSeed): [string, string][] {
	const docs = `${config.paths.docs}/${SYSTEM_DOCS_FOLDER}`;
	return [
		[config.design.tokens, chosen.tokens],
		[`${docs}/${SYSTEM_USAGE_FILE}`, chosen.usage],
		[`${docs}/${SYSTEM_DESIGN_FILE}`, chosen.design],
	];
}

export function systemSeedOf(seed: ProjectSeed, system: string): DesignSystemSeed {
	const chosen = seed.systems[system];
	if (chosen === undefined) {
		throw new Error(unknownSystemSaying(system, Object.keys(seed.systems)));
	}

	return chosen;
}

export function unknownSystemSaying(system: string, known: readonly string[]): string {
	return `no design system named ${system}; pick one of: ${[...known].sort().join(", ")}`;
}

export function filled(text: string, values: TemplateValues): string {
	return text.replace(PLACEHOLDER, (placeholder, key: string) => values[key] ?? placeholder);
}

export function packageNameOf(appName: string): string {
	const named = appName.toLowerCase().replace(NOT_IN_PACKAGE_NAME, "-").replace(EDGE_DASHES, "");
	return named === "" ? UNNAMED_PACKAGE : named;
}

export function engineDependenciesOf(seed: ProjectSeed): Record<string, string> {
	return Object.fromEntries(seed.engine.map(({ name, file }) => [name, `file:${VENDOR_FOLDER}/${file}`]));
}

export function withAppName(configText: string, name: string): string {
	const config = JsonObjectSchema.parse(JSON.parse(configText));
	const app = JsonObjectSchema.parse(config["app"] ?? {});
	const withoutLegacyName = Object.entries(config).filter(([key]) => key !== LEGACY_NAME_KEY);
	return jsonText({ ...Object.fromEntries(withoutLegacyName), app: { ...app, name } });
}

function seededFilesOf(config: ProjectConfig, seed: ProjectSeed): [string, string][] {
	const handbook = `${config.paths.docs}/${HANDBOOK_FOLDER}`;
	const values = templateValuesOf(config, handbook);
	const filledTemplate = ([at, text]: [string, string]): [string, string] => [
		at,
		templateTextOf(at, filled(text, values), { config, seed }),
	];
	return [
		...Object.entries(seed.templates).map(filledTemplate),
		...Object.entries(seed.kit).map(([at, text]): [string, string] => [`${config.paths.kit}/${at}`, text]),
		...Object.entries(seed.handbook).map(([page, text]): [string, string] => [`${handbook}/${page}`, text]),
	];
}

function projectConfigTextOf(name: string, system: string, kitEntries: Readonly<Record<string, string>>): string {
	const { app, paths } = ProjectConfigSchema.parse({ app: { name } });
	const config = ProjectConfigSchema.parse({
		$schema: CONFIG_SCHEMA_URL,
		app,
		paths,
		aliases: kitAliasesOf(kitEntries, paths.kit),
		design: { system },
	});
	return jsonText(config);
}

function kitAliasesOf(kitEntries: Readonly<Record<string, string>>, kitPath: string): Record<string, string> {
	return Object.fromEntries(Object.entries(kitEntries).map(([specifier, at]) => [specifier, `${kitPath}/${at}`]));
}

async function configOf(configText: string): Promise<ProjectConfig> {
	const reading = await readProjectConfig(configFilesOf(configText));
	if ("refusal" in reading) {
		throw new Error(`the written ${PROJECT_CONFIG_FILE} is refused: ${reading.refusal}`);
	}

	return reading.config;
}

function configFilesOf(configText: string): ProjectFiles {
	return {
		list: async () => EMPTY_LISTING,
		read: async (at) => (at === PROJECT_CONFIG_FILE ? configText : null),
		exists: async (at) => at === PROJECT_CONFIG_FILE,
	};
}

function templateValuesOf(config: ProjectConfig, handbook: string): TemplateValues {
	const paths = Object.entries(config.paths).map(([layer, at]) => [`paths.${layer}`, at]);
	return {
		name: config.app.name,
		package: packageNameOf(config.app.name),
		handbook,
		"design.system": config.design.system,
		"design.tokens": config.design.tokens,
		...Object.fromEntries(paths),
	};
}

interface TemplateContext {
	readonly config: ProjectConfig;
	readonly seed: ProjectSeed;
}

function templateTextOf(at: string, text: string, { config, seed }: TemplateContext): string {
	if (at === PACKAGE_MANIFEST) {
		return withDependencies(text, engineDependenciesOf(seed));
	}

	if (at === TSCONFIG) {
		return withTsconfigPaths(text, tsconfigPathsOf(config.aliases));
	}

	return text;
}

function withDependencies(text: string, engine: Readonly<Record<string, string>>): string {
	const manifest = JsonObjectSchema.parse(JSON.parse(text));
	const dependencies = { ...DependenciesSchema.parse(manifest["dependencies"] ?? {}), ...engine };
	return jsonText({ ...manifest, dependencies: sortedByKey(dependencies) });
}

function withTsconfigPaths(text: string, paths: unknown): string {
	const tsconfig = JsonObjectSchema.parse(JSON.parse(text));
	const options = JsonObjectSchema.parse(tsconfig["compilerOptions"] ?? {});
	return jsonText({ ...tsconfig, compilerOptions: { ...options, paths } });
}

function sortedByKey(record: Readonly<Record<string, string>>): Record<string, string> {
	return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

function jsonText(value: object): string {
	return `${JSON.stringify(value, null, "\t")}\n`;
}
