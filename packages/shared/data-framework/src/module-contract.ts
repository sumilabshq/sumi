import type { Runs } from "./module";
import type { Placement, ServerRuns } from "./placement";
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

export type ReachableContract<R extends ServerRuns = ServerRuns> = ContractShape<R> & ((use: ModuleUse) => RemoteModule);

export type ModuleContract<R extends Runs = Runs> = R extends ServerRuns ? ReachableContract<R> : ContractShape<R>;

const RUNS_ON_DEVICE =
	'module "{module}" runs on a device: only a module .on(Server) or .on(Anywhere) is imported over a transport';

const CONTRACTS = new WeakSet<object>();

export function moduleContract<R extends ServerRuns>(
	name: string,
	placement: Placement<R>,
	requests: readonly AnyRequest[],
): ReachableContract<R>;
export function moduleContract(
	name: string,
	placement: Placement<"client">,
	requests: readonly AnyRequest[],
): ContractShape<"client">;
export function moduleContract(
	name: string,
	placement: Placement<Runs>,
	requests: readonly AnyRequest[],
): ContractShape {
	const { runs } = placement;
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
	const contract = Object.assign(Object.defineProperty(remoteModuleOf, "name", { value: name }), { runs, requests });
	CONTRACTS.add(contract);
	return contract;
}

export function isModuleContract(value: unknown): value is ModuleContract<ServerRuns> {
	return typeof value === "function" && CONTRACTS.has(value);
}

function isServerRuns(runs: Runs): runs is ServerRuns {
	return runs === "server" || runs === "anywhere";
}
