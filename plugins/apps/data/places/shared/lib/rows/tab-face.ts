import type { AppKind } from "../../schema/tabs.schema.js";
import { TabArtSchema } from "../../schema/tab-rows.schema.js";
import type { TabArt } from "../../schema/tab-rows.schema.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import type { HostTab } from "../tabs/host-tabs-moment.js";

export interface Named {
	readonly app: AppKind;
	readonly label: string | null;
	readonly title: string | null;
	readonly address: string | null;
}

const UNDRAWN_ART: TabArt = "built-app";

export function titleOf(apps: PlacedApps, { app, label, title, address }: Named): string {
	return label ?? title ?? siteOf(address) ?? newTabTitleOf(apps, app);
}

export function titleOfTab(apps: PlacedApps, tab: HostTab): string {
	return titleOf(apps, {
		app: tab.app,
		label: tab.label,
		title: tab.title,
		address: null,
	});
}

export function tabArtOf(apps: PlacedApps, app: AppKind, address: string | null): TabArt {
	const placed = apps.byId.get(app);

	if (placed === undefined) {
		return UNDRAWN_ART;
	}

	const addressArt = address === null || address === "" ? null : (placed.artOf?.(address) ?? null);
	const drawn = TabArtSchema.safeParse(addressArt ?? placed.art);
	return drawn.success ? drawn.data : UNDRAWN_ART;
}

export function hostOf(url: string): string | null {
	try {
		return new URL(url).host || null;
	} catch {
		return null;
	}
}

function siteOf(address: string | null): string | null {
	return address === null ? null : hostOf(address);
}

function newTabTitleOf(apps: PlacedApps, app: AppKind): string {
	const placed = apps.byId.get(app);
	return placed?.newTabTitle ?? placed?.title ?? app;
}
