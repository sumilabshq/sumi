import type { Runs } from "./module";
import type { OnServer, Placement } from "./placement";
import type { AnyRequest } from "./request";
import type { RemoteTransport } from "./transport";

export interface RemoteModule {
	readonly name: string;
	readonly transport: RemoteTransport;
	readonly publicRequestNames: readonly string[];
}

export class ModuleContract<R extends Runs = Runs> {
	constructor(
		readonly name: string,
		readonly runs: R,
		readonly requests: readonly AnyRequest[],
	) {}

	over(this: ModuleContract<OnServer>, transport: RemoteTransport): RemoteModule {
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
