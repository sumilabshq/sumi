import { refusalOf } from "./answer";
import type { Answer, Refusal } from "./answer";
import type { Asked, Settle } from "./mediator";
import type { RemoteModule } from "./module-contract";
import { RemoteServer } from "./remote-server";
import type { Missing } from "./route-queries";
import type { AnyRequest } from "./request";
import type { HearChanges, RemoteTransport } from "./transport";

export interface ModuleReach {
	readonly importedModuleNames: readonly string[];
	reachesModule(module: string): boolean;
	forwards(request: AnyRequest): boolean;
	run(asked: Asked, settle: Settle): Promise<Answer<unknown>>;
	changes(hear: HearChanges): () => void;
}

interface RemoteEntry {
	readonly server: RemoteServer;
	readonly publicRequestNames: ReadonlySet<string>;
}

const NOT_OVER_NETWORK = "{name} is server-only: it is not callable over the network";

export function notOverNetwork(request: AnyRequest): Refusal {
	return refusalOf("not-found", NOT_OVER_NETWORK.replace("{name}", request.name));
}

export class SingleServer implements ModuleReach {
	readonly importedModuleNames: readonly string[] = [];
	private readonly server: RemoteServer;

	constructor(private readonly transport: RemoteTransport) {
		this.server = new RemoteServer((call) => transport.call(call));
	}

	changes(hear: HearChanges): () => void {
		return this.transport.changes(hear);
	}

	reachesModule(): boolean {
		return true;
	}

	forwards(): boolean {
		return true;
	}

	run(asked: Asked, settle: Settle): Promise<Answer<unknown>> {
		return this.server.run(asked, settle);
	}
}

export class RemoteModules implements ModuleReach {
	readonly importedModuleNames: readonly string[];
	private readonly entries: ReadonlyMap<string, RemoteEntry>;

	private readonly transports: readonly RemoteTransport[];

	constructor(
		remoteModules: readonly RemoteModule[],
		private readonly missing: Missing,
	) {
		this.importedModuleNames = remoteModules.map(({ name }) => name);
		this.transports = [...new Set(remoteModules.map(({ transport }) => transport))];
		this.entries = new Map(
			remoteModules.map(({ name, transport, publicRequestNames }) => [
				name,
				{
					server: new RemoteServer((call) => transport.call(call)),
					publicRequestNames: new Set(publicRequestNames),
				},
			]),
		);
	}

	reachesModule(module: string): boolean {
		return this.entries.has(module);
	}

	changes(hear: HearChanges): () => void {
		const stops = this.transports.map((transport) => transport.changes(hear));
		return () => stops.forEach((stop) => stop());
	}

	forwards(request: AnyRequest): boolean {
		return this.entries.get(request.module ?? "")?.publicRequestNames.has(request.name) === true;
	}

	run(asked: Asked, settle: Settle): Promise<Answer<unknown>> {
		const entry = this.entries.get(asked.request.module ?? "");

		if (entry === undefined) {
			return Promise.resolve(settle.refuse(asked.request, this.missing(asked.request)));
		}

		if (!entry.publicRequestNames.has(asked.request.name)) {
			return Promise.resolve(settle.refuse(asked.request, notOverNetwork(asked.request)));
		}

		return entry.server.run(asked, settle);
	}
}
