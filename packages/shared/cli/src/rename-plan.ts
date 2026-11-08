import path from "node:path";
import { types } from "@babel/core";
import { CAMEL_NAME, KIND_SUFFIX } from "@widgetarium/eslint-plugin/building-block-name";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import type { RenameArgs } from "./rename-args.js";
import { CliRefusal } from "./cli-output.js";
import { refuseClashingPaths } from "./item-names.js";
import { moduleContractsOf } from "./module-contract.js";
import type { HandledItem } from "./module-contract.js";
import { contractListsIn, homesIn, sourcesOf } from "./rename-homes.js";
import type { ContractList, Home, IdentityMethod } from "./rename-homes.js";
import { SEGMENT_NAME, camelOf, kebabOf } from "./scaffold-names.js";

export interface Namespace {
	readonly sources: ReadonlySet<string>;
	readonly constant: string;
	readonly path: readonly string[];
}

export interface Identity {
	readonly file: string;
	readonly method: IdentityMethod;
	readonly from: string;
	readonly to: string;
}

export interface ListEntryRename {
	readonly file: string;
	readonly from: string;
	readonly to: string;
}

export interface RenamePlan {
	readonly from: string;
	readonly to: string;
	readonly oldName: string;
	readonly newName: string;
	readonly sources: ReadonlySet<string>;
	readonly namespace: Namespace | null;
	readonly strings: ReadonlyMap<string, string>;
	readonly identity: Identity | null;
	readonly lists: readonly ListEntryRename[];
	readonly notes: readonly string[];
}

const NOT_FOUND = "nothing is named {target}: no request, event, subscriber, module or plugin";
const AMBIGUOUS = "{target} names more than one thing: {found}; {fix}";
const NOT_A_SEGMENT = "{name} is not a name segment: kebab case of a-z words joined by '-', such as read or read-bytes";
const ELSEWHERE = "{to} is not under {prefix}; rename changes the last segment only";
const SAME_NAME = "{target} is already named {to}";
const KIND_SUFFIXED = "{name} ends with a kind word; a building block is named without its kind";
const NOT_AN_IDENTIFIER = "{name} cannot name a JavaScript constant";
const TAKEN = "{to} is already the name of the {method} in {folder}";
const MODULE_WIRE = "wire names of module {from} now start with {to}.";
const PLUGIN_NAMES =
	"slot names of plugin {from} now start with {to}.; a workspace's sumi.plugins.json keeps its {from} entry";

export function renamePlan(args: RenameArgs, root: string): RenamePlan {
	const homes = homesIn(root);
	const lists = contractListsIn(root);
	const isDotted = args.target.includes(".");

	if (args.kind !== null || !isDotted) {
		return identityPlan({ args, root, homes, lists });
	}

	return itemPlan({ args, root, homes, lists });
}

interface PlanAsk {
	readonly args: RenameArgs;
	readonly root: string;
	readonly homes: readonly Home[];
	readonly lists: readonly ContractList[];
}

function identityPlan({ args, root, homes, lists }: PlanAsk): RenamePlan {
	const home = onlyOf(
		homes.filter(({ id, method }) => id === args.target && (args.kind === null || method === args.kind)),
		{ target: args.target, root, fix: "pass --module or --plugin" },
	);
	const to = checkedSegment(args.to);
	refuseSame(args.target, to);
	const taken = homes.find(({ id, method }) => id === to && method === home.method);

	if (taken !== undefined) {
		throw new CliRefusal(fillTemplate(TAKEN, { to, method: home.method, folder: shown(root, taken.folder) }));
	}

	const newName = checkedConstant(camelOf(to));
	const wires = home.method === "module" ? wireNamesOf(home) : [];
	return {
		from: home.id,
		to,
		oldName: home.constant,
		newName,
		sources: sourcesOf(home, lists),
		namespace: null,
		strings: new Map(wires.map((wire) => [`${home.id}.${wire}`, `${to}.${wire}`])),
		identity: { file: home.file, method: home.method, from: home.id, to },
		lists: lists
			.filter(({ modules }) => home.method === "module" && modules.includes(home.id))
			.map(({ file }) => ({ file, from: home.id, to })),
		notes: [fillTemplate(home.method === "module" ? MODULE_WIRE : PLUGIN_NAMES, { from: home.id, to })],
	};
}

function itemPlan({ args, root, homes, lists }: PlanAsk): RenamePlan {
	const [tag = ""] = args.target.split(".");
	const home = onlyOf(
		homes.filter(({ id, method }) => id === tag && method === "module"),
		{ target: args.target, root, fix: "rename the module(...) string of one" },
	);
	const items = itemsOf(home);
	const item = onlyOf(
		items.filter((each) => fullNameOf(home, each) === args.target),
		{ target: args.target, root, fix: "rename one" },
	);
	const prefix = [tag, ...item.group].join(".");
	const leaf = leafOf(args.to, prefix);
	refuseSame(args.target, `${prefix}.${leaf}`);
	const newName = checkedConstant(camelOf(leaf));
	refuseClashingPaths(
		items
			.filter(({ path: wire }) => wire !== null)
			.map((each) => ({ ...each, name: each === item ? newName : each.name })),
	);
	const isNamed = item.path !== null;
	return {
		from: args.target,
		to: `${prefix}.${leaf}`,
		oldName: item.name,
		newName,
		sources: new Set([path.join(home.folder, item.file)]),
		namespace: { sources: sourcesOf(home, lists), constant: home.constant, path: item.group.map(camelOf) },
		strings: new Map(isNamed ? [[args.target, `${prefix}.${leaf}`]] : []),
		identity: null,
		lists: [],
		notes: [],
	};
}

function itemsOf(home: Home): readonly HandledItem[] {
	return moduleContractsOf(home.folder, home.constant).handledItems;
}

function fullNameOf(home: Home, { name, group }: HandledItem): string {
	return [home.id, ...group, kebabOf(name)].join(".");
}

function wireNamesOf(home: Home): string[] {
	return itemsOf(home).flatMap(({ path: wire }) => (wire === null ? [] : [wire]));
}

function leafOf(to: string, prefix: string): string {
	if (!to.includes(".")) {
		return checkedSegment(to);
	}

	if (!to.startsWith(`${prefix}.`)) {
		throw new CliRefusal(fillTemplate(ELSEWHERE, { to, prefix }));
	}

	return checkedSegment(to.slice(prefix.length + 1));
}

function checkedSegment(name: string): string {
	if (!SEGMENT_NAME.test(name)) {
		throw new CliRefusal(fillTemplate(NOT_A_SEGMENT, { name }));
	}

	return name;
}

function checkedConstant(name: string): string {
	if (!CAMEL_NAME.test(name) || !types.isValidIdentifier(name)) {
		throw new CliRefusal(fillTemplate(NOT_AN_IDENTIFIER, { name }));
	}

	if (KIND_SUFFIX.test(name)) {
		throw new CliRefusal(fillTemplate(KIND_SUFFIXED, { name }));
	}

	return name;
}

function refuseSame(target: string, to: string): void {
	if (target === to) {
		throw new CliRefusal(fillTemplate(SAME_NAME, { target, to }));
	}
}

interface Lookup {
	readonly target: string;
	readonly root: string;
	readonly fix: string;
}

function onlyOf<T extends Home | HandledItem>(found: readonly T[], { target, root, fix }: Lookup): T {
	const [only] = found;

	if (only === undefined) {
		throw new CliRefusal(fillTemplate(NOT_FOUND, { target }));
	}

	if (found.length > 1) {
		const named = found.map((each) => ("folder" in each ? `${each.method} ${shown(root, each.folder)}` : each.file));
		throw new CliRefusal(fillTemplate(AMBIGUOUS, { target, found: named.join(", "), fix }));
	}

	return only;
}

function shown(root: string, folder: string): string {
	return path.relative(root, folder);
}
