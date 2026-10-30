import type { KeptSiteIcon } from "../schema/site-icon.schema.js";

const HOUR_MS = 60 * 60 * 1000;

export const ICON_KEPT_MS = 7 * 24 * HOUR_MS;
export const NO_ICON_KEPT_MS = 6 * HOUR_MS;
export const MOST_KEPT_ICONS = 200;
export const MOST_KEPT_CHARACTERS = 2_000_000;

export function freshIconAt(icons: readonly KeptSiteIcon[], address: string, now: number): KeptSiteIcon | null {
	const kept = icons.find((icon) => icon.address === address);
	return kept !== undefined && isFresh(kept, now) ? kept : null;
}

export function latestIconOfOrigin(icons: readonly KeptSiteIcon[], origin: string, now: number): string | null {
	const latest = icons
		.filter((icon) => icon.origin === origin && icon.icon !== null && isFresh(icon, now))
		.reduce<KeptSiteIcon | null>(
			(best, icon) => (best === null || icon.fetchedAt > best.fetchedAt ? icon : best),
			null,
		);
	return latest?.icon ?? null;
}

export function withIconKept(icons: readonly KeptSiteIcon[], kept: KeptSiteIcon): readonly KeptSiteIcon[] {
	const newestFirst = [kept, ...icons.filter((icon) => icon.address !== kept.address && isFresh(icon, kept.fetchedAt))];
	return withinCaps(newestFirst.sort((one, other) => other.fetchedAt - one.fetchedAt));
}

function isFresh(icon: KeptSiteIcon, now: number): boolean {
	return now - icon.fetchedAt < (icon.icon === null ? NO_ICON_KEPT_MS : ICON_KEPT_MS);
}

function withinCaps(newestFirst: readonly KeptSiteIcon[]): readonly KeptSiteIcon[] {
	const kept: KeptSiteIcon[] = [];
	let characters = 0;

	for (const icon of newestFirst) {
		const weight = icon.icon?.length ?? 0;

		if (kept.length === MOST_KEPT_ICONS) {
			break;
		}

		if (characters + weight > MOST_KEPT_CHARACTERS) {
			continue;
		}

		characters += weight;
		kept.push(icon);
	}

	return kept;
}
