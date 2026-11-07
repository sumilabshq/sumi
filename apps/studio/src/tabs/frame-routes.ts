import { AppearanceModule } from "@sumi/contract";
import type { FrameServing } from "@sumi/sumi-host-plugin";
import { stableKey } from "@widgetarium/data-framework/gateway/stable-key";
import { mountOrStop, runtime } from "@widgetarium/data-framework";
import type { LocalTransport, ModuleContract, RemoteTransport, ServerRuns } from "@widgetarium/data-framework";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";
import { hearsAll } from "../features/app-frame/lib/frame-relay.js";
import type { FrameOpened, FrameRoute, FrameRoutes, FrameRoutesFor } from "../features/app-frame/lib/frame-relay.js";
import { ServerLeases } from "../features/app-frame/lib/server-leases.js";
import type { HeldTransport } from "../features/app-frame/lib/server-leases.js";

export interface ServedFrameModule {
	readonly contract: ModuleContract<ServerRuns>;
	readonly serving: FrameServing;
}

export interface FrameRoutesAsk {
	readonly workspaceId: string;
	readonly core: RemoteTransport;
	readonly coreModules: readonly ModuleContract<ServerRuns>[];
	readonly appearance: RemoteTransport;
	readonly frameModules: readonly ServedFrameModule[];
}

interface LeasedFrameModule {
	readonly served: ServedFrameModule;
	readonly leases: ServerLeases;
}

interface FrameLease {
	readonly ask: FrameRoutesAsk;
	readonly leased: readonly LeasedFrameModule[];
	readonly opened: FrameOpened;
}

const WINDOW_SERVER = "studio";

export function frameRoutesOf(ask: FrameRoutesAsk): FrameRoutesFor {
	const leased = ask.frameModules.map((served) => ({
		served,
		leases: new ServerLeases(served.contract.name, (_key, local) =>
			startFrameModuleServer(local, served.serving, ask.workspaceId),
		),
	}));
	return (opened) =>
		Promise.resolve(
			leaseRoutes({
				ask,
				leased,
				opened,
			}),
		);
}

export function frameModuleRouteOf(
	{ transport }: HeldTransport,
	module: ModuleContract<ServerRuns>,
	tabId: string,
): FrameRoute {
	const ownInput = stableKey({
		tab: tabId,
	});
	return {
		module,
		transport,
		hears: ({ inputKey }) => inputKey === null || inputKey === "" || inputKey === ownInput,
	};
}

function leaseRoutes({ ask, leased, opened }: FrameLease): FrameRoutes {
	const { tabId } = opened;
	const held = leased.map(({ served, leases }) => ({
		served,
		lease: leases.lease(WINDOW_SERVER),
	}));
	return {
		routes: [
			...ask.coreModules.map((module) => ({
				module,
				transport: ask.core,
				hears: hearsAll,
			})),
			...held.map(({ served, lease }) => frameModuleRouteOf(lease, served.contract, tabId)),
			{
				module: AppearanceModule,
				transport: ask.appearance,
				hears: hearsAll,
			},
		],
		release: () => {
			for (const { served, lease } of held) {
				lease.release();
				served.serving.frameClosed(tabId);
			}
		},
	};
}

function startFrameModuleServer(local: LocalTransport, serving: FrameServing, workspaceId: string): () => void {
	const frameModule = runtime().modules(serving.module).start({
		platform: "server",
		env: {},
		scope: {
			workspaceId,
		},
	});
	const stopServing = mountOrStop(frameModule, (started) =>
		local.serve(started, { authenticate: new AppCallerAuthenticate() }),
	);
	return () => {
		stopServing();
		frameModule.stop();
	};
}
