import type { Runs } from "./module";
import type { OnServer, Placement } from "./placement";
import type { AnyRequest } from "./request";

export interface RemoteModule {
	readonly name: string;
	readonly url: string;
	readonly publicRequestNames: readonly string[];
}

const NOT_A_URL =
	'module "{module}" is imported at "{url}", which is not an absolute URL: pass one such as https://api.example.com';

export class ModuleContract<R extends Runs = Runs> {
	constructor(
		readonly name: string,
		readonly runs: R,
		readonly requests: readonly AnyRequest[],
	) {}

	at(this: ModuleContract<OnServer>, url: string): RemoteModule {
		refuseNotUrl(this.name, url);
		return {
			name: this.name,
			url,
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

function refuseNotUrl(module: string, url: string): void {
	if (URL.canParse(url)) {
		return;
	}

	throw new Error(NOT_A_URL.replace("{module}", module).replace("{url}", url));
}
