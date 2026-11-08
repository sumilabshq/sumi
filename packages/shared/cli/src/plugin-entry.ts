import fs from "node:fs";
import path from "node:path";
import { CliRefusal } from "./cli-output.js";
import { checkedCamelName } from "./item-names.js";
import { SEGMENT_NAME } from "./scaffold-names.js";
import { GENERATED_HEADER } from "./module-entry.js";
import type { GeneratedPackage } from "./module-entry.js";
import { filesUnder } from "./template-files.js";
import { exportedConstsOf, rootCallOf } from "@widgetarium/eslint-plugin/babel-chain";
import { parsedSourceOf } from "@widgetarium/eslint-plugin/files";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";

export const PLUGIN_LEVEL = "plugin";
export const PLUGIN_ENTRY = "src/generated/plugin.ts";

const PLUGIN_FILE = "src/plugin.ts";
const GENERATED_FOLDER = "src/generated/";
const FRAMEWORK = "@widgetarium/plugin-framework";
const GENERATED_LOCALS: ReadonlySet<string> = new Set(["pluginWithSlots", "definition"]);
const NOT_ONE_PLUGIN = "{file} exports {count} consts built by plugin(); the generator reads exactly one";
const PLUGIN_NOT_NAMED =
	'{file}: plugin() takes its id as one kebab-case string of a-z, such as plugin("command-menu")';
const TAKEN_NAME = "{file}: {name} is a name the generated plugin file uses itself; rename the plugin's constant";

export function generatedPluginOf(folder: string, shownAs: string): GeneratedPackage {
	const name = pluginNameOf(folder, shownAs);
	const files = [{ entry: PLUGIN_ENTRY, text: GENERATED_HEADER + pluginTextOf(name) }];
	const strays = fs.existsSync(path.join(folder, GENERATED_FOLDER))
		? filesUnder(folder, (relative) => relative.startsWith(GENERATED_FOLDER) && relative !== PLUGIN_ENTRY)
		: [];
	return { files, strays };
}

function pluginNameOf(folder: string, shownAs: string): string {
	const file = `${shownAs}/${PLUGIN_FILE}`;
	const { body } = parsedSourceOf(path.join(folder, PLUGIN_FILE));
	const plugins = exportedConstsOf(body).filter(({ init }) => rootCallOf(init)?.method === "plugin");
	const [only] = plugins;

	if (only === undefined || plugins.length > 1) {
		throw new CliRefusal(fillTemplate(NOT_ONE_PLUGIN, { file, count: String(plugins.length) }));
	}

	const name = checkedCamelName(only.name, file);
	const [id, ...others] = rootCallOf(only.init)?.call.arguments ?? [];

	if (id?.type !== "StringLiteral" || others.length > 0 || !SEGMENT_NAME.test(id.value)) {
		throw new CliRefusal(fillTemplate(PLUGIN_NOT_NAMED, { file }));
	}

	if (GENERATED_LOCALS.has(name)) {
		throw new CliRefusal(fillTemplate(TAKEN_NAME, { file, name }));
	}

	return name;
}

function pluginTextOf(name: string): string {
	return [
		`import { pluginWithSlots } from "${FRAMEWORK}";\n`,
		`import { ${name} as definition } from "../plugin.js";\n`,
		"\n",
		`export const ${name} = pluginWithSlots(definition, {});\n`,
	].join("");
}
