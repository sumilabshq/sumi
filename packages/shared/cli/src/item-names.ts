import { CliRefusal } from "./cli-output.js";
import { isDescriptorKey } from "@widgetarium/data-framework";
import { CAMEL_NAME } from "@widgetarium/eslint-plugin/building-block-name";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import { SEGMENT_NAME, camelOf, kebabOf } from "./scaffold-names.js";

export interface PathedItem {
	readonly name: string;
	readonly file: string;
	readonly group: readonly string[];
}

interface PathedEntry {
	readonly item: PathedItem;
	readonly under: string;
}

const FEATURE_FILE = /^features\/(.+)\/requests\.tsx?$/;
const GATEWAY_EVENTS = /^gateways\/([^/]+)\/.+\.events\.ts$/;
const TOPIC_EVENTS = /^shared\/events\/([^/]+)\.events\.ts$/;
const NOT_CAMEL =
	"{file}: {name} is not a building block name; name it by a camelCase constant of letters with no kind suffix, such as frameSides or toggleFrameSide";
const BAD_SEGMENT =
	"{file}: the folder {segment} is not a name segment; name it in kebab case of a-z, such as frame-sides";
const NO_GROUP = "{file} is not a place generate names items from";
const FIELD_KEY =
	"{file}: the group {group} is a field of the module's descriptor; rename the feature or gateway folder";
const SAME_PATH = "{file}: {name} and {other} are both {path}; a module names each item once";
const PATH_UNDER_PATH =
	"{file}: {name} is {path}, and {other} is named under it as {under}; a name is never a group of another, so rename one";

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

	const bad = group.find((segment) => !SEGMENT_NAME.test(segment));

	if (bad !== undefined) {
		throw new CliRefusal(fillTemplate(BAD_SEGMENT, { file, segment: bad }));
	}

	const [top = ""] = group;

	if (isDescriptorKey(camelOf(top))) {
		throw new CliRefusal(fillTemplate(FIELD_KEY, { file, group: top }));
	}

	return group;
}

export function pathOf({ name, group }: PathedItem): string {
	return [...group, kebabOf(name)].join(".");
}

export function refuseClashingPaths(items: readonly PathedItem[]): void {
	const seen = new Map<string, PathedItem>();

	for (const item of items) {
		const path = pathOf(item);
		const other = seen.get(path);

		if (other !== undefined) {
			throw new CliRefusal(fillTemplate(SAME_PATH, { file: item.file, name: item.name, other: other.name, path }));
		}

		seen.set(path, item);
	}

	seen.forEach((item, under) => refusePathUnderPath(seen, { item, under }));
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

function refusePathUnderPath(seen: ReadonlyMap<string, PathedItem>, { item, under }: PathedEntry): void {
	const segments = under.split(".");

	for (let length = 1; length < segments.length; length++) {
		const path = segments.slice(0, length).join(".");
		const named = seen.get(path);

		if (named !== undefined) {
			throw new CliRefusal(
				fillTemplate(PATH_UNDER_PATH, { file: named.file, name: named.name, path, other: item.name, under }),
			);
		}
	}
}
