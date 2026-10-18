import type { HostApp, StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import { Watchers } from "../../shared/lib/watchers/watchers.js";
import { HostAppsGateway } from "./host-apps.gateway.js";

// TRADE-OFF: the gateway caches the last answer; a shared/lib store would own it, one reader does not earn it
export class StudioHostAppsGateway extends HostAppsGateway {
	private readonly watchers = new Watchers();
	private watching = 0;
	private known: readonly HostApp[] = [];

	constructor(private readonly studioHost: StudioHostPort) {
		super();
	}

	apps(): readonly HostApp[] {
		return this.known;
	}

	watch(changed: () => void): () => void {
		if (this.watching === 0) {
			void this.read();
		}

		this.watching += 1;
		const stop = this.watchers.watch(changed);
		return () => {
			this.watching -= 1;
			stop();
		};
	}

	private async read(): Promise<void> {
		const was = this.known.length;

		try {
			this.known = await this.studioHost.apps();
		} catch (failure: unknown) {
			this.known = [];
			console.info(`[widgetarium] host apps ${was} → 0 (the host answered: ${String(failure)})`);
			this.watchers.tell();
			return;
		}

		console.info(`[widgetarium] host apps ${was} → ${this.known.length} (read for the first watcher)`);
		this.watchers.tell();
	}
}
