import { CliRefusal } from "./cli-output.js";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";

export interface PathedItem {
	readonly name: string;
	readonly file: string;
	readonly group: readonly string[];
}

const CAMEL_NAME = /^[a-z]+([A-Z][a-z]*)*$/;
const FEATURE_FILE = /^features\/(.+)\/requests\.tsx?$/;
const GATEWAY_EVENTS = /^gateways\/([^/]+)\/.+\.events\.ts$/;
const TOPIC_EVENTS = /^shared\/events\/([^/]+)\.events\.ts$/;
const SEGMENT = /^[a-z]+(-[a-z]+)*$/;
const DESCRIPTOR_FIELDS: ReadonlySet<string> = new Set([
	"name",
	"length",
	"runs",
	"requests",
	"call",
	"apply",
	"bind",
	"toString",
	"prototype",
	"arguments",
	"caller",
	"constructor",
]);
const NOT_CAMEL =
	"{file}: {name} is not a building block name; name it by a camelCase constant of letters with no kind suffix, such as frameSides or toggleFrameSide";
const BAD_SEGMENT =
	"{file}: the folder {segment} is not a name segment; name it in kebab case of a-z, such as frame-sides";
const NO_GROUP = "{file} is not a place generate names items from";
const FIELD_KEY =
	"{file}: the group {group} is a field of the module's descriptor; rename the feature or gateway folder";
const SAME_PATH = "{file}: {name} and {other} are both {path}; a module names each item once";

export function kebabOf(camel: string): string {
	return camel.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);
}

export function camelOf(kebab: string): string {
	return kebab.replace(/-([a-z])/g, (_dash, letter: string) => letter.toUpperCase());
}

export function checkedCamelName(name: string, file: string): string {
	if (!CAMEL_NAME.test(name)) {
		throw new CliRefusal(fillTemplate(NOT_CAMEL, { file, name }));
	}

	return name;
}

export function groupOf(file: string): readonly string[] {
	const group = foldersOf(file);

	if (group.length === 0) {
		throw new CliRefusal(fillTemplate(NO_GROUP, { file }));
	}

	const bad = group.find((segment) => !SEGMENT.test(segment));

	if (bad !== undefined) {
		throw new CliRefusal(fillTemplate(BAD_SEGMENT, { file, segment: bad }));
	}

	const [top = ""] = group;

	if (DESCRIPTOR_FIELDS.has(camelOf(top))) {
		throw new CliRefusal(fillTemplate(FIELD_KEY, { file, group: top }));
	}

	return group;
}

export function pathOf({ name, group }: PathedItem): string {
	return [...group, kebabOf(name)].join(".");
}

export function refuseSamePaths(items: readonly PathedItem[]): void {
	const seen = new Map<string, PathedItem>();

	for (const item of items) {
		const path = pathOf(item);
		const other = seen.get(path);

		if (other !== undefined) {
			throw new CliRefusal(fillTemplate(SAME_PATH, { file: item.file, name: item.name, other: other.name, path }));
		}

		seen.set(path, item);
	}
}

export function localsOf<T extends PathedItem>(items: readonly T[], taken: ReadonlySet<string>): Map<T, string> {
	const counts = new Map<string, number>();

	for (const { name } of items) {
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}

	return new Map(
		items.map((item) => {
			const isClashing = (counts.get(item.name) ?? 0) > 1 || taken.has(item.name);
			const local = isClashing ? camelOf([...item.group, kebabOf(item.name)].join("-")) : item.name;
			return [item, local];
		}),
	);
}

function foldersOf(file: string): readonly string[] {
	const feature = FEATURE_FILE.exec(file)?.[1];

	if (feature !== undefined) {
		return feature.split("/");
	}

	const gateway = GATEWAY_EVENTS.exec(file)?.[1] ?? TOPIC_EVENTS.exec(file)?.[1];
	return gateway === undefined ? [] : [gateway];
}
