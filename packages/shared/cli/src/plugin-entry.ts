import fs from "node:fs";
import path from "node:path";
import { CliRefusal } from "./cli-output.js";
import { checkedCamelName } from "./item-names.js";
import { SEGMENT_NAME } from "./scaffold-names.js";
import { GENERATED_HEADER } from "./module-entry.js";
import type { GeneratedPackage } from "./module-entry.js";
import { filesUnder } from "./template-files.js";
import { pluginUiSlotsOf } from "./plugin-ui-slots.js";
import type { PluginUiSlot, SlotElementShape } from "./plugin-ui-slots.js";
import { exportedConstsOf, rootCallOf } from "@widgetarium/eslint-plugin/babel-chain";
import { parsedSourceOf } from "@widgetarium/eslint-plugin/files";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";

export const PLUGIN_LEVEL = "plugin";
export const PLUGIN_ENTRY = "src/generated/plugin.ts";

const PLUGIN_FILE = "src/plugin.ts";
const GENERATED_FOLDER = "src/generated/";
const FRAMEWORK = "@widgetarium/plugin-framework";
const GENERATED_LOCALS: ReadonlySet<string> = new Set([
	"pluginWithSlots",
	"pluginSlot",
	"listPluginSlot",
	"definition",
]);
const BUILDER_OF_SHAPE: Readonly<Record<SlotElementShape, string>> = {
	single: "pluginSlot",
	list: "listPluginSlot",
};
const NOT_ONE_PLUGIN = "{file} exports {count} consts built by plugin(); the generator reads exactly one";
const PLUGIN_NOT_NAMED =
	'{file}: plugin() takes its id as one kebab-case string of a-z, such as plugin("command-menu")';
const TAKEN_NAME = "{file}: {name} is a name the generated plugin file uses itself; rename the plugin's constant";

interface PluginNames {
	readonly name: string;
	readonly id: string;
}

export function generatedPluginOf(folder: string, shownAs: string): GeneratedPackage {
	const { name, id } = pluginNamesOf(folder, shownAs);
	const slots = pluginUiSlotsOf(folder, id, shownAs);
	const files = [{ entry: PLUGIN_ENTRY, text: GENERATED_HEADER + pluginTextOf(name, slots) }];
	const strays = fs.existsSync(path.join(folder, GENERATED_FOLDER))
		? filesUnder(folder, (relative) => relative.startsWith(GENERATED_FOLDER) && relative !== PLUGIN_ENTRY)
		: [];
	return { files, strays };
}

function pluginNamesOf(folder: string, shownAs: string): PluginNames {
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

	return {
		name,
		id: id.value,
	};
}

function pluginTextOf(name: string, slots: readonly PluginUiSlot[]): string {
	const builders = [...new Set(slots.map(({ shape }) => BUILDER_OF_SHAPE[shape]))];
	return [
		`import { ${["pluginWithSlots", ...builders].sort().join(", ")} } from "${FRAMEWORK}";\n`,
		`import { ${name} as definition } from "../plugin.js";\n`,
		"\n",
		`export const ${name} = pluginWithSlots(definition, ${slots.length > 0 ? slotsTextOf(slots) : "{}"});\n`,
	].join("");
}

function slotsTextOf(slots: readonly PluginUiSlot[]): string {
	const lines = slots.map(
		({ key, name, shape, propKeys }) =>
			`\t\t${key}: ${BUILDER_OF_SHAPE[shape]}<${propsTypeOf(propKeys)}>(${JSON.stringify(name)}),\n`,
	);
	return `{\n\tslots: {\n${lines.join("")}\t},\n}`;
}

// TRADE-OFF: each prop typed never: any component taking those keys fits; reading the JSX value types needs the type checker
function propsTypeOf(propKeys: readonly string[]): string {
	return propKeys.length === 0 ? "{}" : `{ ${propKeys.map((key) => `readonly ${key}: never`).join("; ")} }`;
}
