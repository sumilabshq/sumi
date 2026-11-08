import { Event } from "./event";
import type { AnyEvent } from "./event";
import { checkedModuleName } from "./identity";
import { placeItem } from "./handled-items";
import type { Runs } from "./module";
import type { Placement, ServerRuns } from "./placement";
import { Contract } from "./request";
import type { AnyRequest } from "./request";
import type { RemoteTransport } from "./transport";

export interface RemoteModule {
	readonly name: string;
	readonly transport: RemoteTransport;
	readonly publicRequestNames: readonly string[];
}

export interface ModuleUse {
	readonly over: RemoteTransport;
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

export type ModuleContract<R extends Runs = Runs> = R extends ServerRuns ? ReachableContract<R> : ContractShape<R>;

const RUNS_ON_DEVICE =
	'module "{module}" runs on a device: only a module .on(Server) or .on(Anywhere) is imported over a transport';

const CONTRACTS = new WeakSet<object>();

export function moduleNamespace<const T extends ContractTree>(module: string, tree: T): T {
	leavesOf(tree).forEach((leaf) => placeItem(leaf, checkedModuleName(module)));
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
	return Object.values(tree).flatMap((held) => (isLeaf(held) ? [held] : leavesOf(held)));
}

function isLeaf(held: ContractLeaf | ContractTree): held is ContractLeaf {
	return held instanceof Contract || held instanceof Event;
}

function isRequest(leaf: ContractLeaf): leaf is AnyRequest {
	return leaf instanceof Contract;
}
