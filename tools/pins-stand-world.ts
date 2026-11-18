import { orpcTransport, runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { dataFrameworkMiddleware } from "../packages/shared/data-framework/src/server/index.ts";
import { StoreClient } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import type { Invoke } from "../packages/shared/behaviors/src/tauri-store/store-invoke.ts";
import { placesWindowOf } from "../packages/shared/behaviors/src/studio-window/studio-window.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { navigation as placesModule } from "../plugins/tabs/navigation/data/navigation/generated/module.ts";
import { pins } from "../plugins/tabs/pinned-tabs/data/pins/generated/contract.ts";
import { pins as pinsModule } from "../plugins/tabs/pinned-tabs/data/pins/generated/module.ts";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { BUILT_IN_PLACED_APPS } from "./placed-apps-fixture.ts";
import { BARE_SCREEN } from "./places-fixture.ts";
import { FakeStore } from "./host-tauri-fake-store.ts";
import { chatFacts } from "../plugins/ai/chat/data/chat-facts/generated/contract.ts";
import { chatFacts as chatFactsModule } from "../plugins/ai/chat/data/chat-facts/generated/module.ts";

export const WORKSPACE = "stand";
const PIN_APP = "canvas";
export const WINDOW_SCALES: readonly number[] = [10, 25, 50];
const PIN_COUNT = 12;
export const STORM_ROUNDS = 40;
const DISK_DELAY_MS = 3;
const PLACES_FILE = "global:places.json";
const PIN_PREFIX = "pin-";

export interface World {
	readonly fake: FakeStore;
	readonly clients: readonly Runtime[];
	readonly labels: readonly string[];
	readonly live: Set<string>;
	readonly latencies: number[];
}

export interface Opened {
	readonly label: string;
	readonly heldBy: string | null;
	readonly refusal: string | null;
}

console.info = () => undefined;
console.warn = () => undefined;

export const pinIds = Array.from({ length: PIN_COUNT }, (_none, at) => `pin-${at + 1}`);

export function worldOf(windows: number, seed: (fake: FakeStore) => void = () => undefined): World {
	const fake = new FakeStore();
	seed(fake);
	const invoke: Invoke = async (command, args) => {
		await new Promise((done) => setTimeout(done, Math.random() * DISK_DELAY_MS));
		return fake.invoke(command, args);
	};
	const store = new StoreClient(invoke);
	const core = runtime()
		.modules(
			placesModule({ store, apps: BUILT_IN_PLACED_APPS }),
			chatFactsModule({ store, apps: BUILT_IN_PLACED_APPS }),
			pinsModule({ store }),
		)
		.start({ platform: "server", env: {}, scope: { workspaceId: WORKSPACE } });
	const served = dataFrameworkMiddleware(core, { authenticate: new AppCallerAuthenticate() });
	const labels = Array.from({ length: windows }, (_none, at) => `w${at + 1}`);
	const clients = labels.map(() =>
		runtime()
			.imports(
				navigation({ over: orpcTransport("http://core.stand", { fetch: served.fetch }) }),
				pins({ over: orpcTransport("http://core.stand", { fetch: served.fetch }) }),
				chatFacts({ over: orpcTransport("http://core.stand", { fetch: served.fetch }) }),
			)
			.start(),
	);
	return {
		fake,
		clients,
		labels,
		live: new Set<string>(),
		latencies: [],
	};
}

export async function openWindow(world: World, label: string): Promise<void> {
	await clientOf(world, label).send(navigation.windows.openWindow, { window: label });
	world.live.add(label);
}

export async function closeWindow(world: World, label: string): Promise<void> {
	await clientOf(world, label).send(navigation.windows.closeWindow, { window: label });
	world.live.delete(label);
}

export async function openPin(world: World, label: string, id: string): Promise<Opened> {
	const answer = await timed(world, () =>
		clientOf(world, label).send(navigation.tabOpening.openOnce, { at: atOf(label), id, app: PIN_APP, address: "" }),
	);
	return {
		label,
		heldBy: answer.ok ? answer.output.heldBy : null,
		refusal: answer.ok ? null : answer.reason,
	};
}

export async function closePinTab(world: World, label: string, id: string): Promise<void> {
	await timed(world, () => clientOf(world, label).send(navigation.tabClosing.closeTab, { at: atOf(label), id }));
}

export function breachesOf(world: World): readonly string[] {
	const standings = standingsOf(world).filter(({ id }) => id.startsWith(PIN_PREFIX));
	const ids = [...new Set(standings.map(({ id }) => id))];
	const twice = ids.filter((id) => standings.filter((one) => one.id === id).length > 1).map((id) => `${id} open twice`);
	const orphans = standings
		.filter(({ list }) => !world.live.has(list.replace("window:", "").split("@")[0] ?? ""))
		.map(({ id, list }) => `${id} owned by gone ${list}`);
	return [...twice, ...orphans];
}

export function percentilesOf(values: readonly number[]): Readonly<Record<string, number>> {
	const sorted = [...values].sort((one, other) => one - other);
	const at = (share: number): number => Math.round((sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? 0) * 10) / 10;
	return {
		p50: at(0.5),
		p95: at(0.95),
		p99: at(0.99),
		max: at(1),
	};
}

export function clientOf(world: World, label: string): Runtime {
	const client = world.clients[world.labels.indexOf(label)];

	if (client === undefined) {
		throw new Error(`no client for ${label}`);
	}

	return client;
}

export function atOf(label: string, workspace: string = WORKSPACE): { readonly window: string; readonly screen: typeof BARE_SCREEN } {
	return {
		window: placesWindowOf(label, workspace),
		screen: BARE_SCREEN,
	};
}


export interface Standing {
	readonly id: string;
	readonly list: string;
}

export function standingsOf(world: World): readonly Standing[] {
	const doc = world.fake.files.get(PLACES_FILE) as { tabs?: { lists?: Record<string, readonly { kind: string; id: string }[]>; groups?: readonly { id: string; entries: readonly { kind: string; id: string }[] }[] } } | undefined;
	const lists = doc?.tabs?.lists ?? {};
	const groups = doc?.tabs?.groups ?? [];
	return Object.entries(lists).flatMap(([list, entries]) =>
		entries.flatMap((entry) =>
			entry.kind === "tab" ? [{ id: entry.id, list }] : (groups.find((group) => group.id === entry.id)?.entries ?? []).map(({ id }) => ({ id, list })),
		),
	);
}

async function timed<T>(world: World, run: () => Promise<T>): Promise<T> {
	const started = performance.now();
	const result = await run();
	world.latencies.push(performance.now() - started);
	return result;
}
