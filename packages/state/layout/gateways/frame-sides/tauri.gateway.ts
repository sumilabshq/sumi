import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { FrameSideSchema } from "../../shared/schema/frame-sides.schema.js";
import type { FrameSide, FrameSides, SideLook, TabsPlace } from "../../shared/schema/frame-sides.schema.js";
import { FrameSidesGateway } from "./frame-sides.gateway.js";

export const KeptSidesSchema = z.object({
	leftHidden: z.boolean().nullable().catch(null),
	tabsInSidebar: z.boolean().nullable().catch(null),
});

export type KeptSides = z.infer<typeof KeptSidesSchema>;

export const KeptTabsPlaceSchema = z.object({
	tabsInSidebar: z.boolean().nullable().catch(null),
});

export type KeptTabsPlace = z.infer<typeof KeptTabsPlaceSchema>;

const HIDDEN_KEY: Readonly<Record<FrameSide, keyof KeptSides>> = {
	left: "leftHidden",
};

export class TauriFrameSidesGateway extends FrameSidesGateway {
	private readonly listeners = new Set<() => void>();
	private peeking: ReadonlySet<FrameSide> = new Set();

	constructor(
		private readonly settings: HeldDoc<KeptSides>,
		private readonly appSettings: HeldDoc<KeptTabsPlace>,
		private readonly first: FrameSides,
	) {
		super();
	}

	sides(): FrameSides {
		return {
			left: this.lookOf("left"),
			tabs: this.tabsPlace(),
		};
	}

	saveSides(sides: FrameSides, reason: string): void {
		const leftHidden = sides.left !== "docked";
		const tabsInSidebar = sides.tabs === "sidebar";
		this.peeking = new Set(FrameSideSchema.options.filter((side) => sides[side] === "peeking"));

		if (this.settings.now().leftHidden === leftHidden && this.tabsPlace() === sides.tabs) {
			this.listeners.forEach((listener) => listener());
			return;
		}

		if (this.settings.now().leftHidden !== leftHidden) {
			this.settings.change({ leftHidden }, reason);
			void this.settings.flush();
		}

		if (this.appSettings.now().tabsInSidebar !== tabsInSidebar) {
			this.appSettings.change({ tabsInSidebar }, reason);
			void this.appSettings.flush();
		}
	}

	sidesChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		const stopWatching = this.settings.watch(listener);
		const stopWatchingApp = this.appSettings.watch(listener);
		return () => {
			this.listeners.delete(listener);
			stopWatching();
			stopWatchingApp();
		};
	}

	private tabsPlace(): TabsPlace {
		const isInSidebar = this.appSettings.now().tabsInSidebar ?? this.settings.now().tabsInSidebar;

		if (isInSidebar === null) {
			return this.first.tabs;
		}

		return isInSidebar ? "sidebar" : "header";
	}

	private lookOf(side: FrameSide): SideLook {
		if (this.peeking.has(side)) {
			return "peeking";
		}

		const isHidden = this.settings.now()[HIDDEN_KEY[side]];

		if (isHidden === null) {
			return this.first[side];
		}

		return isHidden ? "hidden" : "docked";
	}
}
