import fs from "node:fs";
import path from "node:path";
import { APP_MANIFEST_FILE, AppManifestSchema, CONTRACT_VERSION, contractRefusal } from "@sumi/contract";
import type { AppManifest } from "@sumi/contract";
import { CliRefusal } from "./cli-output.js";
import { GENERATED_HEADER } from "./module-entry.js";
import { moduleFolderOf } from "./workspace-root.js";

export interface RegistryFile {
	readonly entry: string;
	readonly text: string;
}

interface RegisteredRow {
	readonly manifest: AppManifest;
	readonly folder: string;
}

interface AppModuleImport {
	readonly name: string;
	readonly specifier: string;
}

export const APP_REGISTRY_PACKAGE = "packages/shared/app-registry";

const APPS_FOLDER = "apps";
const BUILD_FOLDER = "dist";
const UNREAD = "{file} is not an app manifest: {reason}";
const REFUSED = "{file}: {reason}";
const NOT_ITS_FOLDER = "{file} names the app {id}, but it stands in apps/{folder}";

export function appRegistryFilesOf(cwd: string): readonly RegistryFile[] {
	const rows = registeredRowsIn(cwd);
	return [
		{
			entry: "generated/registered-apps.ts",
			text: GENERATED_HEADER + registeredAppsTextOf(rows),
		},
		{
			entry: "generated/registered-apps.json",
			text: registeredBuildsJsonOf(rows),
		},
		{
			entry: "generated/app-modules.ts",
			text: GENERATED_HEADER + appModulesTextOf(appModuleImportsOf(cwd, rows)),
		},
	];
}

function registeredRowsIn(cwd: string): readonly RegisteredRow[] {
	const apps = path.join(cwd, APPS_FOLDER);
	return fs
		.readdirSync(apps)
		.filter((folder) => fs.existsSync(path.join(apps, folder, APP_MANIFEST_FILE)))
		.sort()
		.map((folder) => registeredRowOf(apps, folder));
}

function registeredRowOf(apps: string, folder: string): RegisteredRow {
	const file = `${APPS_FOLDER}/${folder}/${APP_MANIFEST_FILE}`;
	const read = AppManifestSchema.safeParse(
		JSON.parse(fs.readFileSync(path.join(apps, folder, APP_MANIFEST_FILE), "utf8")),
	);

	if (!read.success) {
		throw new CliRefusal(UNREAD.replace("{file}", file).replace("{reason}", read.error.message));
	}

	if (read.data.id !== folder) {
		throw new CliRefusal(
			NOT_ITS_FOLDER.replace("{file}", file).replace("{id}", read.data.id).replace("{folder}", folder),
		);
	}

	const refusal = contractRefusal(read.data.contract, CONTRACT_VERSION);

	if (refusal !== null) {
		throw new CliRefusal(REFUSED.replace("{file}", file).replace("{reason}", refusal));
	}

	return {
		manifest: read.data,
		folder: `${APPS_FOLDER}/${folder}`,
	};
}

function registeredAppsTextOf(rows: readonly RegisteredRow[]): string {
	const apps = rows.map(({ manifest, folder }) =>
		[
			"\t{",
			`\t\tid: ${JSON.stringify(manifest.id)},`,
			`\t\tname: ${JSON.stringify(manifest.name)},`,
			`\t\tui: ${JSON.stringify(manifest.ui)},`,
			`\t\tbuild: ${JSON.stringify(`${folder}/${BUILD_FOLDER}`)},`,
			"\t},",
		].join("\n"),
	);
	return [
		'import type { RegisteredApp } from "../registered-app.js";',
		"",
		"export const REGISTERED_APPS: readonly RegisteredApp[] = [",
		...apps,
		"];",
		"",
	].join("\n");
}

function registeredBuildsJsonOf(rows: readonly RegisteredRow[]): string {
	const apps = rows.map(({ manifest, folder }) => ({
		id: manifest.id,
		build: `${folder}/${BUILD_FOLDER}`,
	}));
	return `${JSON.stringify({ apps }, null, "\t")}\n`;
}

function appModuleImportsOf(cwd: string, rows: readonly RegisteredRow[]): readonly AppModuleImport[] {
	const names = [...new Set(rows.flatMap(({ manifest }) => manifest.modules.map(({ name }) => name)))].sort();
	return names.flatMap((name) => moduleImportOf(cwd, name));
}

function moduleImportOf(cwd: string, module: string): readonly AppModuleImport[] {
	const name = `${pascalOf(module)}Module`;
	const declares = new RegExp(`export const ${name}\\b`);
	const folder = moduleFolderOf(cwd, module);
	const isDeclared = folder !== null && declares.test(fs.readFileSync(path.join(cwd, folder, "module.ts"), "utf8"));
	return isDeclared
		? [
				{
					name,
					specifier: `@widgetarium/${module}/module`,
				},
			]
		: [];
}

function appModulesTextOf(imports: readonly AppModuleImport[]): string {
	return [
		...imports.map(({ name, specifier }) => `import { ${name} } from ${JSON.stringify(specifier)};`),
		"",
		`export const APP_MODULES = [${imports.map(({ name }) => name).join(", ")}] as const;`,
		"",
	].join("\n");
}

function pascalOf(name: string): string {
	return name
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}
