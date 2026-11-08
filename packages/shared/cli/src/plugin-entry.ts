import fs from "node:fs";
import path from "node:path";
import type { Expression, Statement } from "@babel/types";
import { CliRefusal } from "./cli-output.js";
import { importsIn } from "./contract-imports.js";
import { checkedCamelName } from "./item-names.js";
import { kebabOf } from "./scaffold-names.js";
import { GENERATED_HEADER } from "./module-entry.js";
import type { GeneratedPackage } from "./module-entry.js";
import { filesUnder } from "./template-files.js";
import { chainOf, exportedConstsOf, rootCallOf } from "@widgetarium/eslint-plugin/babel-chain";
import { parsedSourceOf } from "@widgetarium/eslint-plugin/files";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";

export const PLUGIN_LEVEL = "plugin";
export const PLUGIN_ENTRY = "src/generated/plugin.ts";

interface PluginDefinition {
	readonly name: string;
	readonly declared: readonly string[];
}

const PLUGIN_FILE = "src/plugin.ts";
const SLOTS_FILE = "src/slots.ts";
const SLOTS_SPECIFIER = "./slots.js";
const GENERATED_FOLDER = "src/generated/";
const FRAMEWORK = "@widgetarium/plugin-framework";
const GENERATED_LOCALS: ReadonlySet<string> = new Set(["namedPlugin", "namedSlot", "definition", "slots"]);
const NOT_ONE_PLUGIN =
	"{file} exports {count} consts built by plugin(); the generator names the plugin from exactly one";
const TAKEN_NAME = "{file}: {name} is a name the generated plugin file uses itself; rename the plugin's constant";
const NOT_A_SLOT =
	"{file} declares {name}, which is not a slot exported by {slots}; declare only the plugin's own slots";
const UNDECLARED = "{slots} exports the slot {name}, which {file} does not declare; declare it or delete it";

export function generatedPluginOf(folder: string, shownAs: string): GeneratedPackage {
	const definition = pluginDefinitionOf(folder, shownAs);
	const slots = slotNamesOf(folder, shownAs);
	refuseSlotMismatch(definition, slots, shownAs);
	const files = [{ entry: PLUGIN_ENTRY, text: GENERATED_HEADER + pluginTextOf(definition.name, slots) }];
	const strays = fs.existsSync(path.join(folder, GENERATED_FOLDER))
		? filesUnder(folder, (relative) => relative.startsWith(GENERATED_FOLDER) && relative !== PLUGIN_ENTRY)
		: [];
	return { files, strays };
}

function pluginDefinitionOf(folder: string, shownAs: string): PluginDefinition {
	const file = `${shownAs}/${PLUGIN_FILE}`;
	const { body } = parsedSourceOf(path.join(folder, PLUGIN_FILE));
	const plugins = exportedConstsOf(body).filter(({ init }) => rootCallOf(init)?.method === "plugin");
	const [only] = plugins;

	if (only === undefined || plugins.length > 1) {
		throw new CliRefusal(fillTemplate(NOT_ONE_PLUGIN, { file, count: String(plugins.length) }));
	}

	const name = checkedCamelName(only.name, file);

	if (GENERATED_LOCALS.has(name)) {
		throw new CliRefusal(fillTemplate(TAKEN_NAME, { file, name }));
	}

	return {
		name,
		declared: declaredSlotsOf(body, only.init, file, shownAs),
	};
}

function declaredSlotsOf(
	body: readonly Statement[],
	init: Expression,
	file: string,
	shownAs: string,
): readonly string[] {
	const fromSlots = new Map(
		importsIn(body)
			.filter(({ specifier, form }) => specifier === SLOTS_SPECIFIER && form === "named")
			.map(({ local, imported }) => [local, imported] as const),
	);
	return chainOf(init)
		.filter(({ method }) => method === "declare")
		.flatMap(({ call }) => call.arguments)
		.map((argument) => {
			const local = argument.type === "Identifier" ? argument.name : "an expression";
			const imported = fromSlots.get(local);

			if (imported === undefined) {
				throw new CliRefusal(fillTemplate(NOT_A_SLOT, { file, name: local, slots: `${shownAs}/${SLOTS_FILE}` }));
			}

			return imported;
		});
}

function slotNamesOf(folder: string, shownAs: string): readonly string[] {
	const file = path.join(folder, SLOTS_FILE);

	if (!fs.existsSync(file)) {
		return [];
	}

	return exportedConstsOf(parsedSourceOf(file).body)
		.filter(({ init }) => rootCallOf(init)?.method === "slot")
		.map(({ name }) => checkedCamelName(name, `${shownAs}/${SLOTS_FILE}`));
}

function refuseSlotMismatch(definition: PluginDefinition, slots: readonly string[], shownAs: string): void {
	const said = { file: `${shownAs}/${PLUGIN_FILE}`, slots: `${shownAs}/${SLOTS_FILE}` };
	const foreign = definition.declared.find((name) => !slots.includes(name));

	if (foreign !== undefined) {
		throw new CliRefusal(fillTemplate(NOT_A_SLOT, { ...said, name: foreign }));
	}

	const undeclared = slots.find((name) => !definition.declared.includes(name));

	if (undeclared !== undefined) {
		throw new CliRefusal(fillTemplate(UNDECLARED, { ...said, name: undeclared }));
	}
}

function pluginTextOf(name: string, slots: readonly string[]): string {
	const hasSlots = slots.length > 0;
	const slotsImport = hasSlots ? `import * as slots from "../slots.js";\n` : "";
	const named = slots.map((slot) => `\t${slot}: namedSlot(${JSON.stringify(kebabOf(slot))}, slots.${slot}),\n`);
	const listed = hasSlots ? `{\n${named.join("")}}` : "{}";
	return [
		`import { ${hasSlots ? "namedPlugin, namedSlot" : "namedPlugin"} } from "${FRAMEWORK}";\n`,
		`import { ${name} as definition } from "../plugin.js";\n`,
		slotsImport,
		"\n",
		`export const ${name} = namedPlugin(${JSON.stringify(kebabOf(name))}, definition, ${listed});\n`,
	].join("");
}
