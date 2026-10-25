import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { KeptTabsSchema } from "../../shared/schema/tabs-session.schema.js";
import type { KeptTabs } from "../../shared/schema/tabs-session.schema.js";
import { HostTabsGateway } from "./host-tabs.gateway.js";

export const KeptTabsDocSchema = z.looseObject({
	tabs: KeptTabsSchema.nullable().catch(null),
});

export type KeptTabsDoc = z.infer<typeof KeptTabsDocSchema>;

export const WindowViewDocSchema = z.looseObject({
	view: z
		.object({
			shownId: z.string().nullable(),
			lastShown: z.record(z.string(), z.string()),
		})
		.nullable()
		.catch(null),
});

export type WindowViewDoc = z.infer<typeof WindowViewDocSchema>;

interface HeldTabs {
	readonly shared: HeldDoc<KeptTabsDoc>;
	readonly window: HeldDoc<WindowViewDoc> | null;
}

export class TauriHostTabsGateway extends HostTabsGateway {
	private held: HeldTabs | null = null;
	private readonly loaded: Promise<void>;

	constructor(session: Promise<HeldDoc<KeptTabsDoc>>, windowView: Promise<HeldDoc<WindowViewDoc>> | null) {
		super();
		this.loaded = Promise.all([session, windowView]).then(([shared, window]) => {
			this.held = {
				shared,
				window,
			};
		});
	}

	tabsLoaded(): Promise<void> {
		return this.loaded;
	}

	tabs(): KeptTabs | null {
		const shared = this.held?.shared.now().tabs ?? null;
		const window = this.held?.window;

		if (shared === null || window === undefined || window === null) {
			return shared;
		}

		const view = window.now().view;
		return {
			...shared,
			shownId: view?.shownId ?? null,
			lastShown: view?.lastShown ?? {},
		};
	}

	saveTabs(tabs: KeptTabs, reason: string): void {
		if (this.held === null) {
			throw new Error(`[widgetarium] tabs saved before session.json was read (${reason})`);
		}

		const kept = KeptTabsSchema.parse(tabs);
		const { shared, window } = this.held;

		if (window === null) {
			shared.change({ tabs: kept }, `tabs ${reason}`);
			void shared.flush();
			return;
		}

		const sharedNow = shared.now().tabs;
		shared.change(
			{
				tabs: {
					...kept,
					shownId: sharedNow?.shownId ?? null,
					lastShown: sharedNow?.lastShown ?? {},
				},
			},
			`tabs ${reason}`,
		);
		window.change(
			{
				view: {
					shownId: kept.shownId,
					lastShown: kept.lastShown,
				},
			},
			`window view ${reason}`,
		);
		void shared.flush();
		void window.flush();
	}

	tabsChanged(listener: () => void): () => void {
		const stop = this.loaded.then(() => [this.held?.shared.watch(listener), this.held?.window?.watch(listener)]);
		return () => void stop.then((stops) => stops.forEach((stopWatching) => stopWatching?.()));
	}

	keepsPagesAcrossStarts(): boolean {
		return this.opensBesideAnother();
	}

	opensBesideAnother(): boolean {
		return (this.held?.window ?? null) !== null;
	}
}
