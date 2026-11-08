import { Event } from "./event";
import type { AnyEvent } from "./event";
import { checkedModuleName, checkedPrefix } from "./identity";
import { placeItem } from "./handled-items";
import type { Runs } from "./module";
import type { Placement, ServerRuns } from "./placement";
import { Contract } from "./request";
import type { AnyRequest } from "./request";
import type { RemoteTransport } from "./transport";

export interface RemoteModule {
	readonly name: string;
	readonly prefix: string | null;
	readonly transport: RemoteTransport;
	readonly publicRequestNames: readonly string[];
}

export interface ModuleUse {
	readonly over: RemoteTransport;
	readonly prefix?: string | null;
}

export interface ContractShape<R extends Runs = Runs> {
	readonly name: string;
	readonly runs: R;
	readonly requests: readonly AnyRequest[];
}

export type ReachableContract<R extends ServerRuns = ServerRuns> = ContractShape<R> &
	((use: ModuleUse) => RemoteModule);

export type ContractLeaf = AnyRequest | AnyEvent;

export interface ContractTree {
	readonly [key: string]: ContractLeaf | ContractTree;
}

interface KeyedLeaf {
	readonly keys: readonly string[];
	readonly leaf: ContractLeaf;
}

export type ModuleContract<R extends Runs = Runs> = R extends ServerRuns ? ReachableContract<R> : ContractShape<R>;

const RUNS_ON_DEVICE =
	'module "{module}" runs on a device: only a module .on(Server) or .on(Anywhere) is imported over a transport';

const DESCRIPTOR_KEY =
	'module "{module}" names a contract key "{key}", which every module descriptor already holds: rename the feature folder or the constant';
const KEY_NOT_PATH =
	'module "{module}" holds {name} under the key {keys}: a contract key path is its name in camel case, so run npm run generate';
const DESCRIPTOR_METADATA: readonly string[] = ["runs", "requests"];
const DESCRIPTOR_PROBE = (): void => undefined;

const CONTRACTS = new WeakSet<object>();

export function isDescriptorKey(key: string): boolean {
	return key in DESCRIPTOR_PROBE || DESCRIPTOR_METADATA.includes(key);
}

export function moduleNamespace<const T extends ContractTree>(module: string, tree: T): T {
	const name = checkedModuleName(module);
	const descriptorKey = Object.keys(tree).find(isDescriptorKey);

	if (descriptorKey !== undefined) {
		throw new Error(DESCRIPTOR_KEY.replace("{module}", name).replace("{key}", descriptorKey));
	}

	keyedLeavesOf(tree, []).forEach(({ keys, leaf }) => {
		refuseKeyNotPath(name, keys, leaf);
		placeItem(leaf, name);
	});
	return tree;
}

export function moduleContract<R extends ServerRuns, const T extends ContractTree>(
	name: string,
	placement: Placement<R>,
	tree: T,
): ReachableContract<R> & T;
export function moduleContract<const T extends ContractTree>(
	name: string,
	placement: Placement<"client">,
	tree: T,
): ContractShape<"client"> & T;
export function moduleContract(name: string, placement: Placement<Runs>, tree: ContractTree): ContractShape {
	const { runs } = placement;
	const requests = leavesOf(moduleNamespace(name, tree)).filter(isRequest);
	const remoteModuleOf = (use: ModuleUse): RemoteModule => {
		if (!isServerRuns(runs)) {
			throw new Error(RUNS_ON_DEVICE.replace("{module}", name));
		}

		return {
			name,
			prefix: (use.prefix ?? null) === null ? null : checkedPrefix(use.prefix),
			transport: use.over,
			publicRequestNames: requests.map((request) => request.name),
		};
	};
	const contract = Object.assign(Object.defineProperty(remoteModuleOf, "name", { value: name }), tree, {
		runs,
		requests,
	});
	CONTRACTS.add(contract);
	return contract;
}

export function isModuleContract(value: unknown): value is ModuleContract<ServerRuns> {
	return typeof value === "function" && CONTRACTS.has(value);
}

function isServerRuns(runs: Runs): runs is ServerRuns {
	return runs === "server" || runs === "anywhere";
}

function leavesOf(tree: ContractTree): ContractLeaf[] {
	return keyedLeavesOf(tree, []).map(({ leaf }) => leaf);
}

function keyedLeavesOf(tree: ContractTree, above: readonly string[]): KeyedLeaf[] {
	return Object.entries(tree).flatMap(([key, held]) => {
		const keys = [...above, key];
		return isLeaf(held) ? [{ keys, leaf: held }] : keyedLeavesOf(held, keys);
	});
}

function refuseKeyNotPath(module: string, keys: readonly string[], leaf: ContractLeaf): void {
	const { path } = leaf.identity;
	const keyPath = keys.map(kebabOf).join(".");

	if (path === keyPath) {
		return;
	}

	const said = KEY_NOT_PATH.replace("{module}", module).replace("{name}", path ?? "an unnamed item");
	throw new Error(said.replace("{keys}", keys.join(".")));
}

function kebabOf(camel: string): string {
	return camel.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);
}

function isLeaf(held: ContractLeaf | ContractTree): held is ContractLeaf {
	return held instanceof Contract || held instanceof Event;
}

function isRequest(leaf: ContractLeaf): leaf is AnyRequest {
	return leaf instanceof Contract;
}
