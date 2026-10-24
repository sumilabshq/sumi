import { Notice } from "obsidian";
import type { DataAdapter, Plugin } from "obsidian";
import { WidgetRegistry } from "@widgetarium/core/registry.js";
import { StartupCache } from "@widgetarium/core/startup-snapshot.js";
import { createWantedWidgets } from "@widgetarium/core/engine/widgets-wanted.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { WIDGETS_DIR, COMPONENTS_DIR } from "@widgetarium/core/paths.js";
import { measure } from "@widgetarium/core/trace.js";
import { REACT_SURFACE_SOURCE } from "widgetarium:surface";
import { BUILD_STAMP } from "widgetarium:build-stamp";
import { pluginInstaller } from "./legacy/widget-offers.js";
import type { Installer } from "./legacy/widget-offers.js";
import { indexedDbSnapshotStore } from "./legacy/startup-snapshot-store.js";
import { watchWidgetScopes } from "./legacy/widget-watch.js";
import { writeBuiltCards } from "./legacy/built-cards.js";
import { layAgentFiles } from "./legacy/ai/agent-files.js";
import { isAlreadyExists } from "./legacy/studio-host-obsidian.js";

export type WantedWidgets = ReturnType<typeof createWantedWidgets>;

export interface VaultWidgets {
	readonly registry: WidgetRegistry;
	readonly wanted: WantedWidgets;
	readonly started: Promise<void>;
}

interface Upkeep {
	readonly plugin: Plugin;
	readonly registry: WidgetRegistry;
	readonly startupCache: StartupCache;
	readonly installer: Installer;
	queue(work: () => Promise<void>): Promise<void>;
}

const AFTER_FIRST_DRAW_MS = 3000;
const WIDGETS_FETCHED = "Widgetarium: fetched {widgets}";
const NOT_BUILT = "Widgetarium: {widgets} did not build — the console says why";
const NOT_READ = "Widgetarium: the widgets could not be read — the console says why";
const NOT_KEPT_UP = "Widgetarium: the vault widgets were not kept up to date — the console says why";
const NOT_REREAD = "Widgetarium: the changed widgets could not be read again — the console says why";

export function startVaultWidgets(plugin: Plugin): VaultWidgets {
	const adapter = plugin.app.vault.adapter;
	const registry = new WidgetRegistry({ vault: { adapter } }, REACT_SURFACE_SOURCE);
	const startupCache = new StartupCache({
		registry,
		adapter,
		store: indexedDbSnapshotStore(plugin.app),
		stamp: `${plugin.manifest.version}+${BUILD_STAMP}`,
	});
	const installer = pluginInstaller({ app: plugin.app, addedRegistries: () => addedRegistriesOf(plugin) });
	const upkeep: Upkeep = { plugin, registry, startupCache, installer, queue: serialQueue() };
	const started = startupCache
		.mount()
		.then((mounted) => console.info(`[widgetarium] startup: ${mounted.from} ${mounted.widgets} widgets`))
		.catch((failure: unknown) => {
			console.error("[widgetarium] the widgets could not be read", failure);
			new Notice(NOT_READ);
		});
	// TRADE-OFF: a fixed wait, not "after the first draw" — each disk question asked while a studio draws queues behind it
	const timer = window.setTimeout(() => void keepUp(upkeep), AFTER_FIRST_DRAW_MS);
	plugin.register(() => window.clearTimeout(timer));
	plugin.register(() => registry.dropStyles?.());
	return { registry, wanted: wantedOf(registry, installer), started };
}

async function addedRegistriesOf(plugin: Plugin): Promise<unknown[]> {
	const stored: unknown = await plugin.loadData();
	const added = isObject(stored) ? stored["registries"] : undefined;
	return Array.isArray(added) ? added : [];
}

function wantedOf(registry: WidgetRegistry, installer: Installer): WantedWidgets {
	return createWantedWidgets({
		isHeld: (id) => Boolean(registry.get(id)),
		installOne: async (id) => installer.installAt(id, await installer.available()),
		reread: () => registry.load(),
		onInstalled: (ids) => new Notice(WIDGETS_FETCHED.replace("{widgets}", ids.join(", "))),
	});
}

async function keepUp(upkeep: Upkeep): Promise<void> {
	const adapter = upkeep.plugin.app.vault.adapter;
	try {
		for (const folder of [WIDGETS_DIR, COMPONENTS_DIR]) await makeFolder(adapter, folder);
		await upkeep.queue(() => revalidate(upkeep));
		await measure("upkeep · agent files", () => layAgentFiles(adapter));
		const unwatch = watchWidgetScopes(adapter, () => void upkeep.queue(() => reload(upkeep)));
		if (unwatch) upkeep.plugin.register(unwatch);
	} catch (failure) {
		console.error("[widgetarium] the vault widgets were not kept up", failure);
		new Notice(NOT_KEPT_UP);
	}
}

async function makeFolder(adapter: DataAdapter, folder: string): Promise<void> {
	try {
		await adapter.mkdir(folder);
	} catch (failure) {
		if (!isAlreadyExists(failure)) throw failure;
	}
}

async function revalidate(upkeep: Upkeep): Promise<void> {
	const { startupCache, registry } = upkeep;
	const changed = await startupCache.filesChanged();
	if (changed?.length === 0 && startupCache.areBuildsChecked()) return writeCards(upkeep);
	console.info(`[widgetarium] revalidate: ${changed === null ? "files unknown" : `${changed.length} files changed`}`);
	const failures = await rebuildDrifted(upkeep);
	await registry.load();
	if (failures === 0) startupCache.markBuildsChecked();
	await writeCards(upkeep);
}

async function reload(upkeep: Upkeep): Promise<void> {
	await rebuildDrifted(upkeep);
	await upkeep.registry.load();
	await writeCards(upkeep);
}

async function rebuildDrifted(upkeep: Upkeep): Promise<number> {
	const done = await upkeep.installer.rebuildDrifted();
	if (done.rebuilt.length > 0) console.info(`[widgetarium] rebuilt: ${done.rebuilt.join(", ")}`);
	if (done.failures.length > 0)
		new Notice(NOT_BUILT.replace("{widgets}", done.failures.map((each) => each.id).join(", ")));
	return done.failures.length;
}

async function writeCards(upkeep: Upkeep): Promise<void> {
	const written = await writeBuiltCards(upkeep.plugin.app.vault.adapter, upkeep.registry).catch((failure: unknown) => {
		console.error(
			"[widgetarium] the vault widgets' cards were not written, so widgets.mjs cannot read their props",
			failure,
		);
		return [];
	});
	if (written.length > 0) console.info(`[widgetarium] cards written: ${written.join(", ")}`);
}

function serialQueue(): (work: () => Promise<void>) => Promise<void> {
	let last: Promise<void> = Promise.resolve();
	return (work) => {
		last = last.then(work).catch((failure: unknown) => {
			console.error("[widgetarium] the widgets could not be read again", failure);
			new Notice(NOT_REREAD);
		});
		return last;
	};
}
