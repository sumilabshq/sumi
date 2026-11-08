import type { Answer } from "./answer";
import { wireNameOf } from "./identity";
import type { Asked, Settle } from "./mediator";
import type { RemoteModule } from "./module-contract";
import { RemoteServer } from "./remote-server";
import type { Missing } from "./route-queries";
import type { AnyRequest } from "./request";
import type { HearChanges, RemoteTransport } from "./transport";

export interface ModuleReach {
	readonly importedAddresses: readonly string[];
	reachesModule(module: string): boolean;
	forwards(request: AnyRequest): boolean;
	run(asked: Asked, settle: Settle): Promise<Answer<unknown>>;
	changes(hear: HearChanges): () => void;
}

interface RemoteEntry {
	readonly module: string;
	readonly isPrefixed: boolean;
	readonly server: RemoteServer;
	readonly publicRequestNames: ReadonlySet<string>;
}

export class RemoteModules implements ModuleReach {
	readonly importedAddresses: readonly string[];
	private readonly entries: readonly RemoteEntry[];

	private readonly transports: readonly RemoteTransport[];

	constructor(
		remoteModules: readonly RemoteModule[],
		private readonly missing: Missing,
	) {
		this.importedAddresses = remoteModules.map(({ name, prefix }) => wireNameOf(prefix, name));
		this.transports = [...new Set(remoteModules.map(({ transport }) => transport))];
		this.entries = remoteModules.map(({ name, prefix, transport, publicRequestNames }) => ({
			module: name,
			isPrefixed: prefix !== null,
			server: new RemoteServer((call) => transport.call(call), prefix),
			publicRequestNames: new Set(publicRequestNames),
		}));
	}

	reachesModule(module: string): boolean {
		return this.entryOf(module) !== undefined;
	}

	changes(hear: HearChanges): () => void {
		const stops = this.transports.map((transport) => transport.changes(hear));
		return () => stops.forEach((stop) => stop());
	}

	forwards(request: AnyRequest): boolean {
		return this.entryOf(request.module ?? "")?.publicRequestNames.has(request.name) === true;
	}

	run(asked: Asked, settle: Settle): Promise<Answer<unknown>> {
		const entry = this.entryOf(asked.request.module ?? "");

		if (entry === undefined) {
			return Promise.resolve(settle.refuse(asked.request, this.missing(asked.request)));
		}

		return entry.server.run(asked, settle);
	}

	// TODO: prefer the sender's own prefix when two prefixed imports share a module name
	private entryOf(module: string): RemoteEntry | undefined {
		const named = this.entries.filter((entry) => entry.module === module);
		return named.find((entry) => !entry.isPrefixed) ?? (named.length === 1 ? named[0] : undefined);
	}
}
