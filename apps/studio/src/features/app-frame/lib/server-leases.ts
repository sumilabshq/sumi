import { localTransport } from "@widgetarium/data-framework";
import type { LocalTransport, RemoteTransport } from "@widgetarium/data-framework";
import type { StartedServer } from "@widgetarium/data-framework/server";

export interface HeldTransport {
	readonly transport: RemoteTransport;
	release(): void;
}

interface LeasedServer {
	readonly transport: RemoteTransport;
	readonly server: StartedServer;
	readonly frameCount: number;
}

type StartServer = (key: string, local: LocalTransport) => StartedServer;

export class ServerLeases {
	private readonly leased = new Map<string, LeasedServer>();

	constructor(
		private readonly kind: string,
		private readonly startServer: StartServer,
	) {}

	lease(key: string): HeldTransport {
		const held = this.leased.get(key);
		const leased = held === undefined ? this.startLease(key) : this.countFrames(key, held, held.frameCount + 1);
		const release = { isDone: false };
		return {
			transport: leased.transport,
			release: () => {
				if (release.isDone) {
					return;
				}

				release.isDone = true;
				this.releaseLease(key);
			},
		};
	}

	private startLease(key: string): LeasedServer {
		const local = localTransport();
		const leased = {
			transport: local,
			server: this.startServer(key, local),
			frameCount: 1,
		};
		this.leased.set(key, leased);
		console.info(`[widgetarium] ${this.kind} ${key} server none → served, frames 0 → 1`);
		return leased;
	}

	private countFrames(key: string, held: LeasedServer, frameCount: number): LeasedServer {
		const leased = {
			...held,
			frameCount,
		};
		this.leased.set(key, leased);
		console.info(`[widgetarium] ${this.kind} ${key} frames ${held.frameCount} → ${frameCount}`);
		return leased;
	}

	private releaseLease(key: string): void {
		const held = this.leased.get(key);

		if (held === undefined) {
			console.info(`[widgetarium] ${this.kind} ${key} release skipped: no server held`);
			return;
		}

		if (held.frameCount > 1) {
			this.countFrames(key, held, held.frameCount - 1);
			return;
		}

		held.server.stop();
		this.leased.delete(key);
		console.info(`[widgetarium] ${this.kind} ${key} server served → stopped, frames 1 → 0`);
	}
}
