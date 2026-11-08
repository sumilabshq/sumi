import { addressingOf } from "./addressing";
import type { Addressing } from "./addressing";
import { refusalOf } from "./answer";
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
	readonly name: string;
	readonly prefix: string | null;
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
			name: wireNameOf(prefix, name),
			prefix,
			server: new RemoteServer((call) => transport.call(call), prefix),
			publicRequestNames: new Set(publicRequestNames),
		}));
	}

	reachesModule(module: string): boolean {
		return this.importedOf(module).length > 0;
	}

	changes(hear: HearChanges): () => void {
		const stops = this.transports.map((transport) => transport.changes(hear));
		return () => stops.forEach((stop) => stop());
	}

	forwards(request: AnyRequest): boolean {
		return this.importedOf(request.module ?? "").some(({ publicRequestNames }) => publicRequestNames.has(request.name));
	}

	run(asked: Asked, settle: Settle): Promise<Answer<unknown>> {
		const addressing = this.addressingOf(asked);

		if (addressing.kind === "none") {
			return Promise.resolve(settle.refuse(asked.request, this.missing(asked.request)));
		}

		if (addressing.kind === "ambiguous") {
			return Promise.resolve(settle.refuse(asked.request, refusalOf("not-found", addressing.reason)));
		}

		return addressing.target.server.run(asked, settle);
	}

	private addressingOf({ request, sending }: Asked): Addressing<RemoteEntry> {
		return addressingOf(request.name, this.importedOf(request.module ?? ""), sending.inProcessCaller?.prefix ?? null);
	}

	private importedOf(module: string): readonly RemoteEntry[] {
		return this.entries.filter((entry) => entry.module === module);
	}
}
