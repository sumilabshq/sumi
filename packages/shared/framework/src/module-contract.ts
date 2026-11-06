import type { Runs } from "./module";
import type { Placement, ServerRuns } from "./placement";
import type { AnyRequest } from "./request";
import type { RemoteTransport } from "./transport";

export interface RemoteModule {
	readonly name: string;
	readonly transport: RemoteTransport;
	readonly publicRequestNames: readonly string[];
}

const RUNS_ON_DEVICE =
	'module "{module}" runs on a device: only a module .on(Server) or .on(Anywhere) is imported over a transport';

export class ModuleContract<R extends Runs = Runs> {
	constructor(
		readonly name: string,
		readonly runs: R,
		readonly requests: readonly AnyRequest[],
	) {}

	over(this: ModuleContract<ServerRuns>, transport: RemoteTransport): RemoteModule {
		if (!isServerRuns(this.runs)) {
			throw new Error(RUNS_ON_DEVICE.replace("{module}", this.name));
		}

		return {
			name: this.name,
			transport,
			publicRequestNames: this.requests.map(({ name }) => name),
		};
	}
}

export function moduleContract<R extends Runs>(
	name: string,
	placement: Placement<R>,
	requests: readonly AnyRequest[],
): ModuleContract<R> {
	return new ModuleContract(name, placement.runs, requests);
}

function isServerRuns(runs: Runs): runs is ServerRuns {
	return runs === "server" || runs === "anywhere";
}
