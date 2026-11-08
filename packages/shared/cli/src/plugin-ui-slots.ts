import path from "node:path";
import { CliRefusal } from "./cli-output.js";
import { SEGMENT_NAME, camelOf } from "./scaffold-names.js";
import { filesUnder } from "./template-files.js";
import { parsedSourceOf } from "@widgetarium/eslint-plugin/files";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";

export type SlotElementShape = "single" | "list";

export interface PluginUiSlot {
	readonly key: string;
	readonly name: string;
	readonly shape: SlotElementShape;
	readonly propKeys: readonly string[];
}

interface FoundSlot {
	readonly name: string;
	readonly shape: SlotElementShape;
	readonly propKeys: readonly string[];
}

interface AstNode {
	readonly type: string;
	readonly [field: string]: unknown;
}

const SHAPE_OF_ELEMENT: Readonly<Record<string, SlotElementShape>> = {
	PluginSlot: "single",
	ListPluginSlot: "list",
};
const SOURCE_FOLDER = "src/";
const GENERATED_FOLDER = "src/generated/";
const NAME_NOT_LITERAL =
	'{file}: a plugin slot element takes its name as a string, such as name="{plugin}.composer-model"';
const NAME_NOT_OWN =
	'{file}: <…PluginSlot name="{name}"> must be named "{plugin}.<slot>", the plugin\'s id, a dot and one kebab-case segment';
const PROPS_NOT_LITERAL =
	'{file}: <…PluginSlot name="{name}"> takes props as an object literal with named keys, such as props={{ chatId }}';
const NAMED_TWICE = '{file}: <…PluginSlot name="{name}"> is already drawn in {first}: name each slot once';

export function pluginUiSlotsOf(folder: string, pluginId: string, shownAs: string): readonly PluginUiSlot[] {
	const firstFileOf = new Map<string, string>();
	return filesUnder(folder, isSlotSource).flatMap((relative) => {
		const file = `${shownAs}/${relative}`;
		return slotsIn(parsedSourceOf(path.join(folder, relative)).body, { file, plugin: pluginId }).map((found) => {
			const first = firstFileOf.get(found.name);

			if (first !== undefined) {
				throw new CliRefusal(fillTemplate(NAMED_TWICE, { file, name: found.name, first }));
			}

			firstFileOf.set(found.name, file);
			return { key: camelOf(found.name.slice(pluginId.length + 1)), ...found };
		});
	});
}

function isSlotSource(relative: string): boolean {
	return relative.startsWith(SOURCE_FOLDER) && !relative.startsWith(GENERATED_FOLDER) && relative.endsWith(".tsx");
}

type Said = Readonly<Record<"file" | "plugin", string>>;

function slotsIn(nodes: readonly unknown[], said: Said): readonly FoundSlot[] {
	return nodes.flatMap((node) => {
		if (!isAstNode(node)) {
			return [];
		}

		const children = Object.values(node).flatMap((value) => (Array.isArray(value) ? value : [value]));
		const shape = slotShapeOf(node);
		const own = shape === null ? [] : [foundSlotOf(node, shape, said)];
		return [...own, ...slotsIn(children, said)];
	});
}

function slotShapeOf(node: AstNode): SlotElementShape | null {
	const name = nodeAt(node, "name");

	if (node.type !== "JSXOpeningElement" || name?.type !== "JSXIdentifier" || typeof name["name"] !== "string") {
		return null;
	}

	return SHAPE_OF_ELEMENT[name["name"]] ?? null;
}

function foundSlotOf(element: AstNode, shape: SlotElementShape, said: Said): FoundSlot {
	const name = attributeOf(element, "name");

	if (name?.type !== "StringLiteral" || typeof name["value"] !== "string") {
		throw new CliRefusal(fillTemplate(NAME_NOT_LITERAL, said));
	}

	const named = { ...said, name: ownSlotName(name["value"], said) };
	return {
		name: named.name,
		shape,
		propKeys: propKeysOf(attributeOf(element, "props"), named),
	};
}

function ownSlotName(value: string, said: Said): string {
	const [owner, slot, ...rest] = value.split(".");

	if (owner !== said.plugin || slot === undefined || rest.length > 0 || !SEGMENT_NAME.test(slot)) {
		throw new CliRefusal(fillTemplate(NAME_NOT_OWN, { ...said, name: value }));
	}

	return value;
}

function propKeysOf(props: AstNode | null, said: Said & { readonly name: string }): readonly string[] {
	if (props === null) {
		return [];
	}

	const properties = objectPropertiesOf(props) ?? refusedProps(said);
	return properties.map((property) => keyNameOf(property) ?? refusedProps(said));
}

function refusedProps(said: Said & { readonly name: string }): never {
	throw new CliRefusal(fillTemplate(PROPS_NOT_LITERAL, said));
}

function objectPropertiesOf(props: AstNode): readonly unknown[] | null {
	const object = props.type === "JSXExpressionContainer" ? nodeAt(props, "expression") : null;
	const properties = object?.type === "ObjectExpression" ? object["properties"] : null;
	return Array.isArray(properties) ? properties : null;
}

function keyNameOf(property: unknown): string | null {
	const key = isAstNode(property) && property.type === "ObjectProperty" ? nodeAt(property, "key") : null;
	return key?.type === "Identifier" && typeof key["name"] === "string" ? key["name"] : null;
}

function attributeOf(element: AstNode, wanted: string): AstNode | null {
	const attributes = element["attributes"];
	const found = Array.isArray(attributes)
		? attributes.find(
				(attribute) =>
					isAstNode(attribute) && attribute.type === "JSXAttribute" && nodeAt(attribute, "name")?.["name"] === wanted,
			)
		: undefined;
	return isAstNode(found) ? nodeAt(found, "value") : null;
}

function nodeAt(node: AstNode, field: string): AstNode | null {
	const value = node[field];
	return isAstNode(value) ? value : null;
}

function isAstNode(value: unknown): value is AstNode {
	return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}
